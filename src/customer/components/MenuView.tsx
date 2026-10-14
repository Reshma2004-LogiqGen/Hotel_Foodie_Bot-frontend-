import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Carrot, ChefHat, ChevronRight, Clock, Flame, HeartPulse, Leaf, MessageCircleHeart, Pizza, Plus,
  Search, SearchX, Soup, Sparkles, UtensilsCrossed, X,
} from 'lucide-react';
import { formatPrice, SPICE_LEVELS } from '../../admin/format';
import type { Cart, Dish, Menu } from '../types';
import { DishImage, FOOD_PHOTO, Stepper, VegMark } from './ui';

const MAX_PICKS = 8;
const MIN_PICKS = 3;

interface MenuViewProps {
  menu: Menu;
  tableNumber: number;
  cart: Cart;
  dishes: Map<number, Dish>;
  onChangeQuantity: (dishId: number, delta: number) => void;
  onOpenCart: () => void;
}

export default function MenuView({ menu, tableNumber, cart, dishes, onChangeQuantity, onOpenCart }: MenuViewProps) {
  const [query, setQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(menu.categories[0]?.id ?? null);
  const sections = useRef(new Map<number, HTMLElement>());
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  const allDishes = useMemo(() => [...dishes.values()], [dishes]);
  const vegCount = allDishes.filter(dish => dish.isVeg).length;
  const fastest = Math.min(...allDishes.filter(dish => dish.isAvailable).map(dish => dish.prepMinutes));
  const picks = useMemo(
    () => allDishes.filter(dish => dish.isAvailable && dish.imageUrl).slice(0, MAX_PICKS),
    [allDishes],
  );
  const categoryTiles = menu.categories.filter(category => category.items.length > 0);

  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.categories
      .map(category => ({
        ...category,
        items: category.items.filter(dish =>
          (!vegOnly || dish.isVeg)
          && (!q || dish.name.toLowerCase().includes(q) || dish.description.toLowerCase().includes(q)),
        ),
      }))
      .filter(category => category.items.length > 0);
  }, [menu, query, vegOnly]);

  // Highlight the category currently at the top of the screen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(entry => entry.isIntersecting);
        if (visible.length) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveId(Number((visible[0].target as HTMLElement).dataset.categoryId));
        }
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    sections.current.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [visibleCategories]);

  // Keep the active chip visible in the horizontal chip bar (mobile).
  useEffect(() => {
    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>(`[data-chip="${activeId}"]`);
    if (!nav || !chip || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: chip.offsetLeft - nav.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [activeId]);

  const jumpTo = (categoryId: number) => {
    setActiveId(categoryId);
    const section = sections.current.get(categoryId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setQuery('');
      setVegOnly(false);
      requestAnimationFrame(() => sections.current.get(categoryId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const scrollToMenu = () => menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const cartLines = Object.entries(cart);
  const cartCount = cartLines.reduce((sum, [, qty]) => sum + qty, 0);
  const cartTotal = cartLines.reduce((sum, [id, qty]) => sum + (dishes.get(Number(id))?.price ?? 0) * qty, 0);

  return (
    <main className={`cx-page cx-menu ${cartCount ? 'has-cartbar' : ''}`}>
      <section className="cx-hero">
        <div className="cx-hero-text">
          <span className="cx-hero-tag"><Sparkles size={14} /> Good Food, Good Mood.</span>
          <h1>
            Fresh from <span className="cx-text-primary">{menu.restaurant.name}</span> to Table {tableNumber}
          </h1>
          <p>Pick your favourites, place the order and we'll bring it hot to your table.</p>
          <button type="button" className="cx-btn cx-btn--primary cx-hero-cta" onClick={scrollToMenu}>
            Explore menu <ArrowRight size={18} />
          </button>
          <div className="cx-hero-meta">
            <span><UtensilsCrossed size={14} /> {allDishes.length} {allDishes.length === 1 ? 'dish' : 'dishes'}</span>
            {vegCount > 0 && <span><Leaf size={14} /> {vegCount} veg</span>}
            {Number.isFinite(fastest) && <span><Clock size={14} /> From {fastest} min</span>}
          </div>
        </div>
        <div className="cx-hero-art" aria-hidden="true">
          <div className="cx-hero-plate">
            <img src={FOOD_PHOTO} alt="" />
          </div>
          <span className="cx-float is-1"><Pizza size={18} /></span>
          <span className="cx-float is-2"><Leaf size={16} /></span>
          <span className="cx-float is-3"><Carrot size={16} /></span>
          <span className="cx-float is-4"><Soup size={18} /></span>
        </div>
      </section>

      {categoryTiles.length > 1 && (
        <section className="cx-block">
          <header className="cx-block-head">
            <h2>What are you craving?</h2>
            <button type="button" className="cx-view-all" onClick={scrollToMenu}>
              View all <ArrowRight size={15} />
            </button>
          </header>
          <div className="cx-cuisines">
            {categoryTiles.map(category => {
              const photo = category.items.find(dish => dish.imageUrl)?.imageUrl ?? null;
              return (
                <button key={category.id} type="button" className="cx-cuisine" onClick={() => jumpTo(category.id)}>
                  <span className="cx-cuisine-icon">
                    <DishImage src={photo} alt="" />
                  </span>
                  <span className="cx-cuisine-name">{category.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {picks.length >= MIN_PICKS && (
        <section className="cx-block">
          <header className="cx-block-head">
            <h2><ChefHat size={20} className="cx-text-primary" /> Chef's picks</h2>
            <button type="button" className="cx-view-all" onClick={scrollToMenu}>
              View all <ArrowRight size={15} />
            </button>
          </header>
          <div className="cx-picks">
            {picks.map(dish => (
              <PickCard
                key={dish.id}
                dish={dish}
                quantity={cart[dish.id] ?? 0}
                onChangeQuantity={onChangeQuantity}
              />
            ))}
          </div>
        </section>
      )}

      <section className="cx-promo">
        <div className="cx-promo-text">
          <span className="cx-promo-tag">While you wait</span>
          <h2>Chat with a food buddy &amp; see your meal's nutrition</h2>
          <p>Unlocks as soon as you place your order.</p>
        </div>
        <div className="cx-promo-icons" aria-hidden="true">
          <span><MessageCircleHeart size={26} /></span>
          <span><HeartPulse size={26} /></span>
        </div>
      </section>

      <section className="cx-menu-head" ref={menuRef}>
        <h2>Full menu</h2>
        <div className="cx-toolbar">
          <label className="cx-search">
            <Search size={18} />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search dishes..."
              aria-label="Search dishes"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </label>
          <button
            type="button"
            className={`cx-veg-toggle ${vegOnly ? 'is-on' : ''}`}
            onClick={() => setVegOnly(on => !on)}
            aria-pressed={vegOnly}
          >
            <VegMark isVeg />
            Veg only
          </button>
        </div>
      </section>

      <div className="cx-menu-layout">
        {visibleCategories.length > 0 && (
          <nav className="cx-cat-nav" ref={navRef} aria-label="Menu categories">
            {visibleCategories.map(category => (
              <button
                key={category.id}
                type="button"
                data-chip={category.id}
                className={`cx-cat-chip ${activeId === category.id ? 'is-active' : ''}`}
                onClick={() => jumpTo(category.id)}
              >
                {category.name}
                <span className="cx-cat-count">{category.items.length}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="cx-menu-sections">
          {visibleCategories.length === 0 && (
            <div className="cx-empty">
              <SearchX size={32} />
              <h2>No dishes found</h2>
              <p>Try a different search{vegOnly ? ' or turn off Veg only' : ''}.</p>
              <button
                type="button"
                className="cx-btn cx-btn--outline"
                onClick={() => { setQuery(''); setVegOnly(false); }}
              >
                Show full menu
              </button>
            </div>
          )}

          {visibleCategories.map(category => (
            <section
              key={category.id}
              className="cx-menu-section"
              data-category-id={category.id}
              ref={el => {
                if (el) sections.current.set(category.id, el);
                else sections.current.delete(category.id);
              }}
            >
              <h2 className="cx-section-title">
                {category.name}
                <span>({category.items.length})</span>
              </h2>
              <div className="cx-dish-list">
                {category.items.map(dish => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    quantity={cart[dish.id] ?? 0}
                    onChangeQuantity={onChangeQuantity}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {cartCount > 0 && (
        <div className="cx-cartbar-wrap">
          <button type="button" className="cx-cartbar" onClick={onOpenCart}>
            <span className="cx-cartbar-info">
              <span>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
              <strong>{formatPrice(cartTotal)}</strong>
            </span>
            <span className="cx-cartbar-cta">
              View cart <ChevronRight size={20} />
            </span>
          </button>
        </div>
      )}
    </main>
  );
}

interface DishProps {
  dish: Dish;
  quantity: number;
  onChangeQuantity: (dishId: number, delta: number) => void;
}

function DishAction({ dish, quantity, onChangeQuantity }: DishProps) {
  if (!dish.isAvailable) return <span className="cx-soldout">Sold out</span>;
  if (quantity > 0) {
    return (
      <Stepper
        quantity={quantity}
        label={dish.name}
        onAdd={() => onChangeQuantity(dish.id, 1)}
        onRemove={() => onChangeQuantity(dish.id, -1)}
      />
    );
  }
  return (
    <button type="button" className="cx-add-btn" onClick={() => onChangeQuantity(dish.id, 1)} aria-label={`Add ${dish.name}`}>
      Add <Plus size={16} strokeWidth={2.6} />
    </button>
  );
}

function DishMeta({ dish }: { dish: Dish }) {
  return (
    <div className="cx-dish-meta">
      <span><Clock size={13} /> {dish.prepMinutes} min</span>
      {dish.spiceLevel > 0 && (
        <span className="is-spicy"><Flame size={13} /> {SPICE_LEVELS[dish.spiceLevel] ?? 'Spicy'}</span>
      )}
    </div>
  );
}

const PickCard = memo(function PickCard(props: DishProps) {
  const { dish } = props;
  return (
    <article className="cx-pick">
      <div className="cx-pick-photo">
        <DishImage src={dish.imageUrl} alt={dish.name} />
        <span className="cx-pick-veg"><VegMark isVeg={dish.isVeg} /></span>
      </div>
      <div className="cx-pick-body">
        <h3>{dish.name}</h3>
        <DishMeta dish={dish} />
        <div className="cx-dish-foot">
          <strong className="cx-price">{formatPrice(dish.price)}</strong>
          <DishAction {...props} />
        </div>
      </div>
    </article>
  );
});

const DishCard = memo(function DishCard(props: DishProps) {
  const { dish } = props;
  return (
    <article className={`cx-dish ${dish.isAvailable ? '' : 'is-soldout'}`}>
      <DishImage src={dish.imageUrl} alt={dish.name} className="cx-dish-photo" />
      <div className="cx-dish-body">
        <div className="cx-dish-title">
          <VegMark isVeg={dish.isVeg} />
          <h3>{dish.name}</h3>
        </div>
        {dish.description && <p className="cx-dish-desc">{dish.description}</p>}
        <DishMeta dish={dish} />
        <div className="cx-dish-foot">
          <strong className="cx-price">{formatPrice(dish.price)}</strong>
          <DishAction {...props} />
        </div>
      </div>
    </article>
  );
});
