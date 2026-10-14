import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CircleAlert, ImagePlus, Trash, X } from 'lucide-react';
import { assetUrl } from '../../shared/apiBase';
import { useBackButton } from '../../shared/backButton';
import { adminApi, errorMessage } from '../api';
import { SPICE_LEVELS } from '../format';
import type { Category, Dish, DishInput } from '../types';
import { Spinner, Switch } from './ui';

const MAX_IMAGE_MB = 5;
const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/webp'];

interface FormState {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  isVeg: boolean;
  spiceLevel: number;
  prepMinutes: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

type FieldErrors = Partial<Record<'name' | 'price' | 'categoryId' | 'prepMinutes', string>>;

function initialForm(dish: Dish | null, defaultCategoryId: number | null): FormState {
  return {
    name: dish?.name ?? '',
    description: dish?.description ?? '',
    price: dish ? String(dish.price) : '',
    categoryId: String(dish?.categoryId ?? defaultCategoryId ?? ''),
    isVeg: dish?.isVeg ?? true,
    spiceLevel: dish?.spiceLevel ?? 0,
    prepMinutes: String(dish?.prepMinutes ?? 15),
    imageUrl: dish?.imageUrl ?? null,
    isAvailable: dish?.isAvailable ?? true,
  };
}

function validate(form: FormState): { errors: FieldErrors; input?: DishInput } {
  const errors: FieldErrors = {};
  const price = Number(form.price);
  const prepMinutes = Number(form.prepMinutes);

  if (!form.name.trim()) errors.name = 'Enter the dish name.';
  if (!form.price.trim() || !Number.isFinite(price) || price <= 0) errors.price = 'Enter a price above ₹0.';
  if (!form.categoryId) errors.categoryId = 'Choose a category.';
  if (!Number.isInteger(prepMinutes) || prepMinutes < 1 || prepMinutes > 180) {
    errors.prepMinutes = 'Use 1–180 minutes.';
  }
  if (Object.keys(errors).length) return { errors };

  return {
    errors,
    input: {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      categoryId: Number(form.categoryId),
      isVeg: form.isVeg,
      spiceLevel: form.spiceLevel,
      prepMinutes,
      imageUrl: form.imageUrl,
      isAvailable: form.isAvailable,
    },
  };
}

export default function DishDrawer({ open, dish, categories, defaultCategoryId, onClose, onSaved }: {
  open: boolean;
  dish: Dish | null;
  categories: Category[];
  defaultCategoryId: number | null;
  onClose: () => void;
  onSaved: (dish: Dish, created: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialForm(dish, defaultCategoryId));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initialForm(dish, defaultCategoryId));
      setErrors({});
      setFormError('');
      setSaving(false);
      setUploading(false);
    }
  }, [open, dish, defaultCategoryId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  useBackButton(open, () => { if (!saving && !uploading) onClose(); });

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    if (key in errors) setErrors(current => ({ ...current, [key]: undefined }));
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_IMAGES.includes(file.type)) {
      setFormError('Use a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setFormError(`Image is too large. Maximum size is ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setFormError('');
    setUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      update('imageUrl', url);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const { errors: nextErrors, input } = validate(form);
    setErrors(nextErrors);
    if (!input) return;

    setFormError('');
    setSaving(true);
    try {
      const saved = dish ? await adminApi.updateDish(dish.id, input) : await adminApi.createDish(input);
      onSaved(saved, !dish);
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  };

  const busy = saving || uploading;

  return (
    <div className="adm-overlay adm-overlay--drawer" onMouseDown={() => !busy && onClose()}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={dish ? 'Edit dish' : 'Add dish'} onMouseDown={e => e.stopPropagation()}>
        <div className="adm-drawer-header">
          <h2>{dish ? 'Edit dish' : 'Add dish'}</h2>
          <button className="adm-icon-btn" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </div>

        <form id="adm-dish-form" className="adm-drawer-body" onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="adm-alert" role="alert">
              <CircleAlert size={18} />
              {formError}
            </div>
          )}

          <div className="adm-field">
            <span className="adm-label">Photo</span>
            <div className={`adm-photo ${form.imageUrl ? 'has-image' : ''}`}>
              {form.imageUrl ? (
                <img src={assetUrl(form.imageUrl) ?? undefined} alt="" />
              ) : (
                <button type="button" className="adm-photo-empty" onClick={() => fileInput.current?.click()} disabled={uploading}>
                  <ImagePlus size={26} />
                  <span>Upload a photo</span>
                  <small>JPG, PNG or WEBP · up to {MAX_IMAGE_MB} MB</small>
                </button>
              )}
              {uploading && <div className="adm-photo-loading"><Spinner size={24} /></div>}
            </div>
            {form.imageUrl && (
              <div className="adm-photo-actions">
                <button type="button" className="adm-btn adm-btn--outline adm-btn--sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                  <ImagePlus size={16} /> Change
                </button>
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => update('imageUrl', null)} disabled={uploading}>
                  <Trash size={16} /> Remove
                </button>
              </div>
            )}
            <input ref={fileInput} type="file" accept={ACCEPTED_IMAGES.join(',')} hidden onChange={handleFile} />
          </div>

          <label className="adm-field">
            <span className="adm-label">Dish name</span>
            <input
              className={`adm-input ${errors.name ? 'has-error' : ''}`}
              placeholder="e.g. Chicken Biryani"
              maxLength={120}
              value={form.name}
              onChange={e => update('name', e.target.value)}
              autoFocus={!dish}
            />
            {errors.name && <span className="adm-field-error">{errors.name}</span>}
          </label>

          <label className="adm-field">
            <span className="adm-label">Description <em>(optional)</em></span>
            <textarea
              className="adm-input adm-textarea"
              placeholder="A short line customers will see on the menu"
              maxLength={500}
              rows={3}
              value={form.description}
              onChange={e => update('description', e.target.value)}
            />
          </label>

          <div className="adm-field-row">
            <label className="adm-field">
              <span className="adm-label">Price (₹)</span>
              <input
                className={`adm-input ${errors.price ? 'has-error' : ''}`}
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                placeholder="240"
                value={form.price}
                onChange={e => update('price', e.target.value)}
              />
              {errors.price && <span className="adm-field-error">{errors.price}</span>}
            </label>
            <label className="adm-field">
              <span className="adm-label">Prep time (min)</span>
              <input
                className={`adm-input ${errors.prepMinutes ? 'has-error' : ''}`}
                type="number"
                inputMode="numeric"
                min="1"
                max="180"
                value={form.prepMinutes}
                onChange={e => update('prepMinutes', e.target.value)}
              />
              {errors.prepMinutes && <span className="adm-field-error">{errors.prepMinutes}</span>}
            </label>
          </div>

          <label className="adm-field">
            <span className="adm-label">Category</span>
            <select
              className={`adm-input adm-select ${errors.categoryId ? 'has-error' : ''}`}
              value={form.categoryId}
              onChange={e => update('categoryId', e.target.value)}
            >
              <option value="" disabled>Choose a category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <span className="adm-field-error">{errors.categoryId}</span>}
          </label>

          <div className="adm-field">
            <span className="adm-label">Type</span>
            <div className="adm-segmented">
              <button type="button" className={form.isVeg ? 'is-active is-veg' : ''} onClick={() => update('isVeg', true)}>
                <span className="adm-veg-mark is-veg" /> Veg
              </button>
              <button type="button" className={!form.isVeg ? 'is-active is-nonveg' : ''} onClick={() => update('isVeg', false)}>
                <span className="adm-veg-mark is-nonveg" /> Non-veg
              </button>
            </div>
          </div>

          <div className="adm-field">
            <span className="adm-label">Spice level</span>
            <div className="adm-segmented">
              {SPICE_LEVELS.map((label, level) => (
                <button
                  key={label}
                  type="button"
                  className={form.spiceLevel === level ? 'is-active' : ''}
                  onClick={() => update('spiceLevel', level)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="adm-toggle-row">
            <div>
              <strong>Available</strong>
              <span>Turn off when the dish is sold out.</span>
            </div>
            <Switch checked={form.isAvailable} onChange={value => update('isAvailable', value)} label="Available" />
          </div>
        </form>

        <div className="adm-drawer-footer">
          <button type="button" className="adm-btn adm-btn--outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="adm-dish-form" className="adm-btn adm-btn--primary" disabled={busy}>
            {saving && <Spinner size={16} />}
            {dish ? 'Save changes' : 'Add dish'}
          </button>
        </div>
      </aside>
    </div>
  );
}
