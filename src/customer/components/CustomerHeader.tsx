import { ArrowLeft, MapPin, ShoppingBag } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Restaurant } from '../types';
import { BrandLogo } from './ui';

interface CustomerHeaderProps {
  restaurant: Restaurant;
  tableNumber: number;
  /** Leave out to hide the cart button (e.g. after the order is placed). */
  cartCount?: number;
  onCartClick?: () => void;
}

export default function CustomerHeader({ restaurant, tableNumber, cartCount, onCartClick }: CustomerHeaderProps) {
  const navigate = useNavigate();
  const { state } = useLocation();

  // Guests who opened the QR link from their camera app have no page to go back to; send them to the scanner.
  const goBack = () => {
    if ((state as { fromScanner?: boolean } | null)?.fromScanner) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <header className="cx-header">
      <div className="cx-header-inner">
        <div className="cx-header-brand">
          <button type="button" className="cx-icon-btn cx-header-back" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
          <BrandLogo />
          <div className="cx-header-text">
            <strong>{restaurant.name}</strong>
            <span><MapPin size={13} /> Dining at Table {tableNumber}</span>
          </div>
        </div>
        {cartCount !== undefined && (
          <button
            type="button"
            className="cx-icon-btn cx-header-cart"
            onClick={onCartClick}
            aria-label={cartCount ? `Open cart, ${cartCount} items` : 'Open cart'}
          >
            <ShoppingBag size={22} />
            {cartCount > 0 && <span className="cx-badge">{cartCount}</span>}
          </button>
        )}
      </div>
    </header>
  );
}
