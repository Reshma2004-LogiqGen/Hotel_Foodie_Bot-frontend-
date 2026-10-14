import { useState, type ReactNode } from 'react';
import { Minus, Plus, UtensilsCrossed } from 'lucide-react';
import { assetUrl } from '../../shared/apiBase';

export const FOOD_PHOTO = 'https://www.themealdb.com/images/media/meals/xrttsx1487339558.jpg';

export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <span className="cx-logo" style={{ width: size, height: size }} aria-hidden="true">
      <UtensilsCrossed size={Math.round(size * 0.5)} strokeWidth={2.4} />
    </span>
  );
}

export function VegMark({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`cx-veg-mark ${isVeg ? 'is-veg' : 'is-nonveg'}`}
      role="img"
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
    />
  );
}

export function DishImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`cx-dish-img cx-dish-img--empty ${className}`} aria-hidden="true">
        <UtensilsCrossed size={22} />
      </div>
    );
  }
  return (
    <img
      className={`cx-dish-img ${className}`}
      src={assetUrl(src) ?? undefined}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function Stepper({
  quantity,
  onAdd,
  onRemove,
  label,
  size = 'md',
}: {
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`cx-stepper cx-stepper--${size}`}>
      <button type="button" onClick={onRemove} aria-label={`Remove one ${label}`}>
        <Minus size={16} strokeWidth={2.6} />
      </button>
      <span aria-live="polite">{quantity}</span>
      <button type="button" onClick={onAdd} aria-label={`Add one more ${label}`}>
        <Plus size={16} strokeWidth={2.6} />
      </button>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="cx-spinner-wrap" role="status">
      <span className="cx-spinner" />
      {label && <p>{label}</p>}
    </div>
  );
}

export function MessageScreen({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="cx-message-screen">
      <div className="cx-message-card">
        <div className="cx-message-icon">{icon}</div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
        {action}
      </div>
    </div>
  );
}
