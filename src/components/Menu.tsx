import '../styles/Menu.css';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  emoji: string;
  description?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface MenuProps {
  items: MenuItem[];
  onAddToCart: (itemId: number) => void;
  cart: CartItem[];
}

export default function Menu({ items, onAddToCart, cart }: MenuProps) {
  const getItemQuantity = (itemId: number) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h2>Our Menu</h2>
        <p>Fresh & delicious dishes made with love 💕</p>
      </div>
      
      <div className="menu-grid">
        {items.map(item => {
          const quantity = getItemQuantity(item.id);
          
          return (
            <div key={item.id} className={`menu-card ${quantity > 0 ? 'in-cart' : ''}`}>
              <div className="card-emoji">{item.emoji}</div>
              <div className="card-content">
                <h3 className="card-name">{item.name}</h3>
                {item.description && (
                  <p className="card-description">{item.description}</p>
                )}
                <div className="card-footer">
                  <span className="card-price">${item.price.toFixed(2)}</span>
                  <button 
                    className="add-btn"
                    onClick={() => onAddToCart(item.id)}
                  >
                    {quantity > 0 ? (
                      <span className="quantity-badge">{quantity}</span>
                    ) : (
                      '+'
                    )}
                  </button>
                </div>
              </div>
              {quantity > 0 && (
                <div className="in-cart-badge">
                  ✓ In Cart
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
