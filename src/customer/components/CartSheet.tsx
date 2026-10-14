import { useEffect, useState } from 'react';
import { AlertCircle, NotebookPen, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatPrice } from '../../admin/format';
import { useBackButton } from '../../shared/backButton';
import type { Cart, Dish } from '../types';
import { useBodyScrollLock } from '../hooks';
import ScrollRail from './ScrollRail';
import { DishImage, Stepper, VegMark } from './ui';

interface CartSheetProps {
  open: boolean;
  tableNumber: number;
  cart: Cart;
  dishes: Map<number, Dish>;
  onClose: () => void;
  onChangeQuantity: (dishId: number, delta: number) => void;
  onClear: () => void;
  onPlaceOrder: (notes: string) => Promise<void>;
}

export default function CartSheet({
  open, tableNumber, cart, dishes, onClose, onChangeQuantity, onClear, onPlaceOrder,
}: CartSheetProps) {
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);

  useBodyScrollLock(open);
  useBackButton(open, () => { if (!placing) onClose(); });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !placing) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, placing, onClose]);

  if (!open) return null;

  const lines = Object.entries(cart)
    .map(([id, quantity]) => ({ dish: dishes.get(Number(id)), quantity }))
    .filter((line): line is { dish: Dish; quantity: number } => Boolean(line.dish));
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.dish.price * line.quantity, 0);

  const submit = async () => {
    setPlacing(true);
    setError(null);
    try {
      await onPlaceOrder(notes.trim());
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your order could not be placed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="cx-overlay" onClick={() => !placing && onClose()}>
      <section
        className="cx-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cx-cart-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="cx-sheet-head">
          <div>
            <h2 id="cx-cart-title">Your cart</h2>
            <span>Table {tableNumber}{count ? ` · ${count} ${count === 1 ? 'item' : 'items'}` : ''}</span>
          </div>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close cart" disabled={placing}>
            <X size={22} />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="cx-sheet-body cx-empty">
            <ShoppingBag size={36} />
            <h2>Your cart is empty</h2>
            <p>Add a few dishes from the menu to get started.</p>
            <button type="button" className="cx-btn cx-btn--primary" onClick={onClose}>Browse menu</button>
          </div>
        ) : (
          <>
            <div className="cx-sheet-body" ref={setBodyEl}>
              <ScrollRail target={bodyEl} />
              <ul className="cx-cart-list">
                {lines.map(({ dish, quantity }) => (
                  <li key={dish.id} className="cx-cart-item">
                    <DishImage src={dish.imageUrl} alt={dish.name} className="cx-cart-photo" />
                    <div className="cx-cart-info">
                      <div className="cx-dish-title">
                        <VegMark isVeg={dish.isVeg} />
                        <h3>{dish.name}</h3>
                      </div>
                      <span className="cx-price">{formatPrice(dish.price)}</span>
                    </div>
                    <div className="cx-cart-side">
                      <Stepper
                        size="sm"
                        quantity={quantity}
                        label={dish.name}
                        onAdd={() => onChangeQuantity(dish.id, 1)}
                        onRemove={() => onChangeQuantity(dish.id, -1)}
                      />
                      <strong>{formatPrice(dish.price * quantity)}</strong>
                    </div>
                  </li>
                ))}
              </ul>

              <button type="button" className="cx-link-btn" onClick={onClear} disabled={placing}>
                <Trash2 size={15} /> Clear cart
              </button>

              <label className="cx-field">
                <span><NotebookPen size={16} /> Cooking instructions <em>(optional)</em></span>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Less spicy, no onions"
                />
              </label>

              <div className="cx-bill">
                <h3>Order summary</h3>
                <div className="cx-bill-row">
                  <span>Item total ({count} {count === 1 ? 'item' : 'items'})</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="cx-bill-row cx-bill-total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <footer className="cx-sheet-foot">
              {error && (
                <div className="cx-alert" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="button"
                className="cx-btn cx-btn--primary cx-btn--block cx-btn--lg cx-btn--split"
                onClick={submit}
                disabled={placing}
              >
                <span>{placing ? 'Placing order...' : 'Place order'}</span>
                <span>{formatPrice(total)}</span>
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
