import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, errorMessage } from '../api';
import type { Category } from '../types';
import { Modal, Spinner } from './ui';

export default function CategoryModal({ open, category, onClose, onSaved }: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSaved: (category: Category) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '');
      setError('');
      setSaving(false);
    }
  }, [open, category]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a category name.');
      return;
    }
    setSaving(true);
    try {
      const saved = category
        ? await adminApi.updateCategory(category.id, { name: trimmed })
        : await adminApi.createCategory(trimmed);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={category ? 'Rename category' : 'New category'}
      onClose={onClose}
      footer={
        <>
          <button className="adm-btn adm-btn--outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="adm-btn adm-btn--primary" type="submit" form="adm-category-form" disabled={saving}>
            {saving && <Spinner size={16} />}
            {category ? 'Save' : 'Add category'}
          </button>
        </>
      }
    >
      <form id="adm-category-form" onSubmit={handleSubmit} noValidate>
        <label className="adm-field">
          <span className="adm-label">Category name</span>
          <input
            className={`adm-input ${error ? 'has-error' : ''}`}
            placeholder="e.g. Starters"
            maxLength={60}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          {error && <span className="adm-field-error">{error}</span>}
        </label>
      </form>
    </Modal>
  );
}
