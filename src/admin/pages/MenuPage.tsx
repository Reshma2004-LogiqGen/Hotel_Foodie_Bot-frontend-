import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, Clock, Eye, EyeOff, Flame, ImageOff, Pencil, Plus, RefreshCw, Search, Trash, UtensilsCrossed,
} from 'lucide-react';
import { assetUrl } from '../../shared/apiBase';
import { adminApi, errorMessage } from '../api';
import { SPICE_LEVELS, formatPrice } from '../format';
import type { Category, Dish } from '../types';
import CategoryModal from '../components/CategoryModal';
import DishDrawer from '../components/DishDrawer';
import { useToast } from '../components/Toast';
import { ActionMenu, ConfirmDialog, EmptyState, PageHeader, Spinner, Switch, VegMark } from '../components/ui';

type Filter = 'all' | 'veg' | 'nonveg' | 'soldout';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'veg', label: 'Veg' },
  { id: 'nonveg', label: 'Non-veg' },
  { id: 'soldout', label: 'Sold out' },
];

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

export default function MenuPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selected, setSelected] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [drawer, setDrawer] = useState<{ dish: Dish | null } | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ category: Category | null } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [nextCategories, nextDishes] = await Promise.all([adminApi.listCategories(), adminApi.listDishes()]);
      setCategories(nextCategories);
      setDishes(nextDishes);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const countByCategory = useMemo(() => {
    const counts = new Map<number, number>();
    dishes.forEach(d => d.categoryId && counts.set(d.categoryId, (counts.get(d.categoryId) ?? 0) + 1));
    return counts;
  }, [dishes]);

  const categoryName = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
  const selectedCategory = selected === 'all' ? null : categories.find(c => c.id === selected) ?? null;

  const visibleDishes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const categoryPosition = new Map(categories.map((c, index) => [c.id, index]));
    return dishes
      .filter(d => {
        if (selected !== 'all' && d.categoryId !== selected) return false;
        if (filter === 'veg' && !d.isVeg) return false;
        if (filter === 'nonveg' && d.isVeg) return false;
        if (filter === 'soldout' && d.isAvailable) return false;
        return !query || d.name.toLowerCase().includes(query) || d.description.toLowerCase().includes(query);
      })
      .sort((a, b) =>
        (categoryPosition.get(a.categoryId ?? -1) ?? Infinity) - (categoryPosition.get(b.categoryId ?? -1) ?? Infinity)
        || a.sortOrder - b.sortOrder
        || a.id - b.id,
      );
  }, [dishes, categories, selected, filter, search]);

  // ---------- dishes ----------

  const toggleAvailability = async (dish: Dish, isAvailable: boolean) => {
    setDishes(current => current.map(d => (d.id === dish.id ? { ...d, isAvailable } : d)));
    try {
      await adminApi.updateDish(dish.id, { isAvailable });
      toast.success(isAvailable ? `${dish.name} is available again` : `${dish.name} marked sold out`);
    } catch (err) {
      setDishes(current => current.map(d => (d.id === dish.id ? { ...d, isAvailable: !isAvailable } : d)));
      toast.error(errorMessage(err));
    }
  };

  const handleDishSaved = (saved: Dish, created: boolean) => {
    setDishes(current => (created ? [...current, saved] : current.map(d => (d.id === saved.id ? saved : d))));
    setDrawer(null);
    toast.success(created ? `${saved.name} added to the menu` : 'Changes saved');
  };

  const confirmDeleteDish = (dish: Dish) => setPendingConfirm({
    title: 'Delete dish?',
    message: `"${dish.name}" will be removed from the menu. This can't be undone.`,
    confirmLabel: 'Delete dish',
    action: async () => {
      await adminApi.deleteDish(dish.id);
      setDishes(current => current.filter(d => d.id !== dish.id));
      toast.success(`${dish.name} deleted`);
    },
  });

  // ---------- categories ----------

  const handleCategorySaved = (saved: Category) => {
    const exists = categories.some(c => c.id === saved.id);
    setCategories(current => (exists ? current.map(c => (c.id === saved.id ? saved : c)) : [...current, saved]));
    setCategoryModal(null);
    if (!exists) setSelected(saved.id);
    toast.success(exists ? 'Category renamed' : `${saved.name} added`);
  };

  const toggleCategoryVisibility = async (category: Category) => {
    try {
      const saved = await adminApi.updateCategory(category.id, { isVisible: !category.isVisible });
      setCategories(current => current.map(c => (c.id === saved.id ? saved : c)));
      toast.success(saved.isVisible ? `${saved.name} is shown on the menu` : `${saved.name} is hidden from customers`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const moveCategory = async (category: Category, direction: -1 | 1) => {
    const index = categories.findIndex(c => c.id === category.id);
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);
    try {
      setCategories(await adminApi.reorderCategories(reordered.map(c => c.id)));
    } catch (err) {
      setCategories(categories);
      toast.error(errorMessage(err));
    }
  };

  const confirmDeleteCategory = (category: Category) => {
    const count = countByCategory.get(category.id) ?? 0;
    const dishWord = count === 1 ? 'dish' : 'dishes';
    setPendingConfirm({
      title: `Delete ${category.name}?`,
      message: count
        ? `The category and its ${count} ${dishWord} will be removed from the menu. This can't be undone.`
        : `"${category.name}" will be removed. This can't be undone.`,
      confirmLabel: count ? `Delete category & ${count} ${dishWord}` : 'Delete category',
      action: async () => {
        await adminApi.deleteCategory(category.id, count > 0);
        setCategories(current => current.filter(c => c.id !== category.id));
        setDishes(current => current.filter(d => d.categoryId !== category.id));
        setSelected('all');
        toast.success(`${category.name} deleted`);
      },
    });
  };

  const runConfirm = async () => {
    if (!pendingConfirm) return;
    try {
      await pendingConfirm.action();
      setPendingConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // ---------- render ----------

  if (loading) {
    return <div className="adm-page-loading"><Spinner size={28} /></div>;
  }

  if (loadError) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Couldn't load the menu"
        text={loadError}
        action={<button className="adm-btn adm-btn--primary" onClick={load}>Try again</button>}
      />
    );
  }

  const selectedIndex = selectedCategory ? categories.findIndex(c => c.id === selectedCategory.id) : -1;
  const openAddDish = () => {
    if (!categories.length) {
      toast.error('Add a category first.');
      setCategoryModal({ category: null });
      return;
    }
    setDrawer({ dish: null });
  };

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle={`${dishes.length} ${dishes.length === 1 ? 'dish' : 'dishes'} · ${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`}
        actions={
          <button className="adm-btn adm-btn--primary" onClick={openAddDish}>
            <Plus size={18} /> Add dish
          </button>
        }
      />

      <div className="adm-menu-layout">
        <section className="adm-card adm-cat-panel" aria-label="Categories">
          <div className="adm-cat-header">
            <h2>Categories</h2>
            <button className="adm-icon-btn" onClick={() => setCategoryModal({ category: null })} aria-label="Add category" title="Add category">
              <Plus size={18} />
            </button>
          </div>
          <div className="adm-cat-list">
            <button className={`adm-cat-item ${selected === 'all' ? 'is-active' : ''}`} onClick={() => setSelected('all')}>
              <span className="adm-cat-name">All dishes</span>
              <span className="adm-count">{dishes.length}</span>
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`adm-cat-item ${selected === category.id ? 'is-active' : ''} ${category.isVisible ? '' : 'is-hidden'}`}
                onClick={() => setSelected(category.id)}
              >
                <span className="adm-cat-name">
                  {category.name}
                  {!category.isVisible && <EyeOff size={14} aria-label="Hidden from menu" />}
                </span>
                <span className="adm-count">{countByCategory.get(category.id) ?? 0}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="adm-card adm-dish-panel">
          <div className="adm-dish-panel-header">
            <div className="adm-dish-panel-title">
              <h2>{selectedCategory?.name ?? 'All dishes'}</h2>
              {selectedCategory && !selectedCategory.isVisible && (
                <span className="adm-badge adm-badge--muted"><EyeOff size={12} /> Hidden from menu</span>
              )}
            </div>
            {selectedCategory && (
              <div className="adm-cat-actions">
                <button
                  className="adm-btn adm-btn--outline adm-btn--sm adm-btn--danger-text"
                  onClick={() => confirmDeleteCategory(selectedCategory)}
                >
                  <Trash size={15} /> Delete
                </button>
                <ActionMenu
                  label="Category options"
                  actions={[
                    { label: 'Rename', icon: Pencil, onSelect: () => setCategoryModal({ category: selectedCategory }) },
                    selectedCategory.isVisible
                      ? { label: 'Hide from menu', icon: EyeOff, onSelect: () => toggleCategoryVisibility(selectedCategory) }
                      : { label: 'Show on menu', icon: Eye, onSelect: () => toggleCategoryVisibility(selectedCategory) },
                    { label: 'Move up', icon: ArrowUp, onSelect: () => moveCategory(selectedCategory, -1), disabled: selectedIndex <= 0 },
                    { label: 'Move down', icon: ArrowDown, onSelect: () => moveCategory(selectedCategory, 1), disabled: selectedIndex >= categories.length - 1 },
                    { label: 'Delete category', icon: Trash, onSelect: () => confirmDeleteCategory(selectedCategory), danger: true },
                  ]}
                />
              </div>
            )}
          </div>

          <div className="adm-toolbar">
            <label className="adm-input-wrap adm-search">
              <Search size={18} className="adm-input-icon" />
              <input
                className="adm-input adm-input--icon"
                placeholder="Search dishes"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search dishes"
              />
            </label>
            <div className="adm-chips" role="group" aria-label="Filter dishes">
              {FILTERS.map(f => (
                <button key={f.id} className={`adm-chip ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {visibleDishes.length === 0 ? (
            dishes.length === 0 || (selectedCategory && !countByCategory.get(selectedCategory.id)) ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="No dishes yet"
                text={selectedCategory ? `Add the first dish to ${selectedCategory.name}.` : 'Add your first dish to start building the menu.'}
                action={<button className="adm-btn adm-btn--primary" onClick={openAddDish}><Plus size={18} /> Add dish</button>}
              />
            ) : (
              <EmptyState icon={Search} title="No matching dishes" text="Try a different search or filter." />
            )
          ) : (
            <ul className="adm-dish-list">
              {visibleDishes.map(dish => (
                <li key={dish.id} className={`adm-dish ${dish.isAvailable ? '' : 'is-soldout'}`}>
                  <div className="adm-dish-thumb">
                    {dish.imageUrl ? <img src={assetUrl(dish.imageUrl) ?? undefined} alt="" loading="lazy" /> : <ImageOff size={20} />}
                  </div>
                  <div className="adm-dish-info">
                    <div className="adm-dish-name">
                      <VegMark isVeg={dish.isVeg} />
                      <span>{dish.name}</span>
                      {!dish.isAvailable && <span className="adm-badge adm-badge--warning">Sold out</span>}
                    </div>
                    {dish.description && <p className="adm-dish-desc">{dish.description}</p>}
                    <div className="adm-dish-meta">
                      {selected === 'all' && dish.categoryId && <span>{categoryName.get(dish.categoryId)}</span>}
                      <span><Clock size={13} /> {dish.prepMinutes} min</span>
                      {dish.spiceLevel > 0 && <span><Flame size={13} /> {SPICE_LEVELS[dish.spiceLevel]}</span>}
                    </div>
                  </div>
                  <div className="adm-dish-price">{formatPrice(dish.price)}</div>
                  <div className="adm-dish-actions">
                    <Switch
                      checked={dish.isAvailable}
                      onChange={value => toggleAvailability(dish, value)}
                      label={dish.isAvailable ? `${dish.name} is available` : `${dish.name} is sold out`}
                    />
                    <button className="adm-icon-btn" onClick={() => setDrawer({ dish })} aria-label={`Edit ${dish.name}`} title="Edit">
                      <Pencil size={17} />
                    </button>
                    <button className="adm-icon-btn adm-icon-btn--danger" onClick={() => confirmDeleteDish(dish)} aria-label={`Delete ${dish.name}`} title="Delete">
                      <Trash size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DishDrawer
        open={drawer !== null}
        dish={drawer?.dish ?? null}
        categories={categories}
        defaultCategoryId={selectedCategory?.id ?? categories[0]?.id ?? null}
        onClose={() => setDrawer(null)}
        onSaved={handleDishSaved}
      />

      <CategoryModal
        open={categoryModal !== null}
        category={categoryModal?.category ?? null}
        onClose={() => setCategoryModal(null)}
        onSaved={handleCategorySaved}
      />

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel ?? ''}
        onConfirm={runConfirm}
        onClose={() => setPendingConfirm(null)}
      />
    </>
  );
}
