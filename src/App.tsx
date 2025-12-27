import { useState, useCallback, useEffect } from 'react';
import QRScanner from './components/QRScanner';
import Menu from './components/Menu';
import OrderNutrition from './components/OrderNutrition';
import ChatBot from './components/ChatBot';
import { orderApi } from './services/api';
import './styles/App.css';

// Types
interface CartItem {
  id: number;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  tableNumber: number;
}

// App Steps
type AppStep = 'scanning' | 'menu' | 'order_confirmed' | 'chatting';

// Popup Steps
type PopupStep = 'chat_prompt' | 'persona_selection';

// Menu Items
const MENU_ITEMS = [
  { id: 1, name: 'Margherita Pizza', price: 12.99, emoji: '🍕', description: 'Classic tomato & mozzarella' },
  { id: 2, name: 'Chicken Burger', price: 9.99, emoji: '🍔', description: 'Juicy grilled chicken patty' },
  { id: 3, name: 'Caesar Salad', price: 8.49, emoji: '🥗', description: 'Fresh romaine & parmesan' },
  { id: 4, name: 'Pasta Carbonara', price: 14.99, emoji: '🍝', description: 'Creamy bacon pasta' },
  { id: 5, name: 'Fish & Chips', price: 13.49, emoji: '🐟', description: 'Crispy battered fish' },
  { id: 6, name: 'Veggie Wrap', price: 7.99, emoji: '🌯', description: 'Healthy vegetable wrap' },
  { id: 7, name: 'Sushi Platter', price: 18.99, emoji: '🍣', description: 'Assorted fresh sushi' },
  { id: 8, name: 'Tacos', price: 10.99, emoji: '🌮', description: 'Mexican style tacos' },
  { id: 9, name: 'Grilled Salmon', price: 16.99, emoji: '🐠', description: 'Atlantic salmon fillet' },
  { id: 10, name: 'Butter Chicken', price: 13.99, emoji: '🍛', description: 'Creamy Indian curry' },
  { id: 11, name: 'Mushroom Risotto', price: 12.49, emoji: '🍚', description: 'Creamy Italian rice' },
  { id: 12, name: 'BBQ Ribs', price: 19.99, emoji: '🍖', description: 'Slow-cooked pork ribs' },
  { id: 13, name: 'Greek Salad', price: 7.99, emoji: '🥒', description: 'Feta & olive salad' },
  { id: 14, name: 'Chicken Wings', price: 11.99, emoji: '🍗', description: 'Crispy buffalo wings' },
  { id: 15, name: 'Paneer Tikka', price: 10.99, emoji: '🧀', description: 'Grilled Indian cottage cheese' },
  { id: 16, name: 'Fruit Smoothie', price: 5.99, emoji: '🥤', description: 'Fresh blended fruits' },
];

// Stop all speech
const stopSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

// Speak function
const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1.2;
    utterance.volume = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
};

export default function App() {
  const [step, setStep] = useState<AppStep>('scanning');
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [nutritionLoaded, setNutritionLoaded] = useState(false);
  const [showFullscreenPopup, setShowFullscreenPopup] = useState(false);
  const [popupStep, setPopupStep] = useState<PopupStep>('chat_prompt');
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [notInterestedClicks, setNotInterestedClicks] = useState(0);

  // Stop speech when leaving chat page
  useEffect(() => {
    if (step !== 'chatting') {
      stopSpeech();
    }
  }, [step]);

  // Show fullscreen popup 5 seconds after nutrition loads
  useEffect(() => {
    if (nutritionLoaded && !showFullscreenPopup && notInterestedClicks < 3) {
      const timer = setTimeout(() => {
        setShowFullscreenPopup(true);
        setPopupStep('chat_prompt');
      }, 5000); // 5 seconds delay

      return () => clearTimeout(timer);
    }
  }, [nutritionLoaded, showFullscreenPopup, notInterestedClicks]);

  // Handle QR scan
  const handleScan = (table: number) => {
    console.log('Table scanned:', table);
    setTableNumber(table);
    setStep('menu');
  };

  // Cart functions
  const addToCart = (itemId: number) => {
    const menuItem = MENU_ITEMS.find(item => item.id === itemId);
    if (!menuItem) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        return prev.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...menuItem, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.id !== itemId);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Place order
  const placeOrder = async () => {
    if (cart.length === 0 || !tableNumber) return;

    const newOrder: Order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      items: cart,
      total: getCartTotal(),
      status: 'confirmed',
      tableNumber: tableNumber,
    };

    // Send to backend using API service
    try {
      await orderApi.placeOrder({
        items: cart.map(item => ({ 
          id: item.id, 
          name: item.name, 
          quantity: item.quantity,
          price: item.price,
          emoji: item.emoji
        })),
        tableNumber: tableNumber,
        total: getCartTotal(),
        orderId: newOrder.id,
      });
    } catch (err) {
      console.error('Order API error:', err);
    }

    setOrder(newOrder);
    setStep('order_confirmed');
    setShowCart(false);
  };

  // Nutrition loaded callback
  const handleNutritionLoaded = useCallback(() => {
    setNutritionLoaded(true);
  }, []);

  // Handle "Yes, Let's Chat!" click - show persona selection IN POPUP
  const handleYesLetsChat = () => {
    setPopupStep('persona_selection');
  };

  // Handle Not Interested clicks
  const handleNotInterested = () => {
    const newClickCount = notInterestedClicks + 1;
    setNotInterestedClicks(newClickCount);

    if (newClickCount === 1) {
      // First click - just show sad emoji (handled in UI)
      console.log('First click - showing sad emoji');
    } else if (newClickCount === 2) {
      // Second click - play voice message
      speak("Oh come on! You're breaking my heart here! I promise I'm fun to talk to!");
    } else if (newClickCount >= 3) {
      // Third click - dismiss popup and leave them alone
      setShowFullscreenPopup(false);
    }
  };

  // Handle persona selection - go to chat
  const handlePersonaSelect = (persona: string) => {
    stopSpeech();
    setSelectedPersona(persona);
    setShowFullscreenPopup(false);
    setStep('chatting');
  };

  // Handle "Maybe Later" in persona selection
  const handleMaybeLater = () => {
    setShowFullscreenPopup(false);
    setNotInterestedClicks(3); // Prevent popup from showing again
  };

  // Handle back from persona selection to chat prompt
  const handleBackToPrompt = () => {
    setPopupStep('chat_prompt');
  };

  // Handle chat close
  const handleChatClose = () => {
    stopSpeech();
    setStep('order_confirmed');
  };

  // New order
  const startNewOrder = () => {
    stopSpeech();
    setCart([]);
    setOrder(null);
    setNutritionLoaded(false);
    setShowFullscreenPopup(false);
    setPopupStep('chat_prompt');
    setSelectedPersona(null);
    setNotInterestedClicks(0);
    setStep('menu');
  };

  // Back to scanner
  const backToScanner = () => {
    stopSpeech();
    setCart([]);
    setOrder(null);
    setTableNumber(null);
    setNutritionLoaded(false);
    setShowFullscreenPopup(false);
    setPopupStep('chat_prompt');
    setSelectedPersona(null);
    setNotInterestedClicks(0);
    setStep('scanning');
  };

  // Get popup emoji based on clicks
  const getPopupEmoji = () => {
    if (notInterestedClicks === 0) return '💬';
    if (notInterestedClicks === 1) return '😢';
    if (notInterestedClicks === 2) return '😭';
    return '💬';
  };

  // Get popup message based on clicks
  const getPopupMessage = () => {
    if (notInterestedClicks === 0) {
      return {
        title: "Your order is being prepared!",
        subtitle: "Would you like to chat with our friendly assistant while you wait?"
      };
    }
    if (notInterestedClicks === 1) {
      return {
        title: "Aww, are you sure?",
        subtitle: "I promise I won't bite... I'm just a friendly chatbot!"
      };
    }
    if (notInterestedClicks === 2) {
      return {
        title: "Pretty please? 🥺",
        subtitle: "Just one little chat? I've been practicing my jokes all day!"
      };
    }
    return {
      title: "Your order is being prepared!",
      subtitle: "Would you like to chat with our friendly assistant while you wait?"
    };
  };

  return (
    <div className="app">
      {/* Step 1: QR Scanner */}
      {step === 'scanning' && (
        <QRScanner onScan={handleScan} />
      )}

      {/* Step 2: Menu */}
      {step === 'menu' && (
        <div className="menu-page">
          <header className="app-header">
            <div className="header-left">
              <button className="back-btn" onClick={backToScanner}>
                ← Back
              </button>
            </div>
            <div className="header-center">
              <h1>🍕 Food Friend</h1>
              <span className="table-badge">Table {tableNumber}</span>
            </div>
            <div className="header-right">
              <button 
                className="cart-btn" 
                onClick={() => setShowCart(true)}
              >
                🛒 
                {getCartCount() > 0 && (
                  <span className="cart-count">{getCartCount()}</span>
                )}
              </button>
            </div>
          </header>

          <Menu 
            items={MENU_ITEMS} 
            onAddToCart={addToCart} 
            cart={cart}
          />

          {/* Floating Cart Button */}
          {cart.length > 0 && !showCart && (
            <button className="floating-cart" onClick={() => setShowCart(true)}>
              <span className="cart-icon">🛒</span>
              <span className="cart-info">
                {getCartCount()} items • ${getCartTotal().toFixed(2)}
              </span>
              <span className="view-cart">View Cart →</span>
            </button>
          )}

          {/* Cart Modal */}
          {showCart && (
            <div className="cart-modal-overlay" onClick={() => setShowCart(false)}>
              <div className="cart-modal" onClick={e => e.stopPropagation()}>
                <div className="cart-header">
                  <h2>🛒 Your Cart</h2>
                  <button className="close-cart" onClick={() => setShowCart(false)}>✕</button>
                </div>
                
                <div className="cart-items">
                  {cart.length === 0 ? (
                    <div className="empty-cart">
                      <span className="empty-icon">🛒</span>
                      <p>Your cart is empty</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="cart-item">
                        <span className="item-emoji">{item.emoji}</span>
                        <div className="item-details">
                          <span className="item-name">{item.name}</span>
                          <span className="item-price">${item.price.toFixed(2)}</span>
                        </div>
                        <div className="quantity-controls">
                          <button onClick={() => removeFromCart(item.id)}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => addToCart(item.id)}>+</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="cart-footer">
                    <div className="cart-total">
                      <span>Total</span>
                      <span className="total-amount">${getCartTotal().toFixed(2)}</span>
                    </div>
                    <button className="checkout-btn" onClick={placeOrder}>
                      Place Order 🚀
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Order Confirmed */}
      {step === 'order_confirmed' && order && (
        <div className="order-confirmed-page">
          <div className="confirmation-card">
            {/* Top Section */}
            <div className="confirmation-top">
              <div className="success-animation">
                <span className="success-icon">✅</span>
              </div>
              <div>
                <h1>Order Confirmed!</h1>
                <p className="order-id">Order #{order.id}</p>
                <p className="table-info">Table {order.tableNumber}</p>
              </div>
            </div>

            {/* Main Content - Horizontal */}
            <div className="confirmation-content">
              {/* Left: Order Summary */}
              <div className="order-summary">
                <h3>📋 Order Summary</h3>
                {order.items.map(item => (
                  <div key={item.id} className="summary-item">
                    <span>{item.emoji} {item.name} x{item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="summary-total">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Right: Nutrition */}
              <div className="nutrition-section">
                <OrderNutrition 
                  items={order.items} 
                  onLoaded={handleNutritionLoaded}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="new-order-btn" onClick={startNewOrder}>
                🍽️ Order More
              </button>
              <button className="home-btn" onClick={backToScanner}>
                🏠 New Table
              </button>
            </div>
          </div>

          {/* FULLSCREEN POPUP - Chat Prompt OR Persona Selection */}
          {showFullscreenPopup && (
            <div className="fullscreen-chat-prompt">
              <div className="chat-prompt-container">
                {/* Animated background circles */}
                <div className="bg-circle circle-1"></div>
                <div className="bg-circle circle-2"></div>
                <div className="bg-circle circle-3"></div>

                {/* STEP 1: Chat Prompt */}
                {popupStep === 'chat_prompt' && (
                  <div className="chat-prompt-main">
                    <span className={`chat-prompt-emoji ${notInterestedClicks > 0 ? 'sad' : ''}`}>
                      {getPopupEmoji()}
                    </span>
                    
                    <h2 className="chat-prompt-title">{getPopupMessage().title}</h2>
                    <p className="chat-prompt-subtitle">{getPopupMessage().subtitle}</p>

                    <div className="chat-prompt-buttons">
                      <button className="chat-yes-btn" onClick={handleYesLetsChat}>
                        <span>Yes, Let's Chat!</span>
                        <span className="btn-sparkle">✨</span>
                      </button>
                      
                      <button 
                        className={`chat-no-btn ${notInterestedClicks > 0 ? 'clicked' : ''}`}
                        onClick={handleNotInterested}
                      >
                        {notInterestedClicks === 0 && "Not Interested"}
                        {notInterestedClicks === 1 && "Still No Thanks 😢"}
                        {notInterestedClicks === 2 && "I Really Mean It! 😭"}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Persona Selection - INSIDE POPUP */}
                {popupStep === 'persona_selection' && (
                  <div className="popup-persona-selection">
                    <button className="popup-back-btn" onClick={handleBackToPrompt}>
                      ← Back
                    </button>
                    
                    <span className="persona-select-emoji">🤖</span>
                    <h2 className="persona-select-title">Choose Your Chat Buddy</h2>
                    <p className="persona-select-subtitle">How would you like me to chat with you?</p>

                    <div className="popup-persona-grid">
                      <button className="popup-persona-card" onClick={() => handlePersonaSelect('friend')}>
                        <span className="emoji">🤗</span>
                        <span className="label">Friend</span>
                        <span className="desc">Casual & fun</span>
                      </button>
                      <button className="popup-persona-card" onClick={() => handlePersonaSelect('lover')}>
                        <span className="emoji">💕</span>
                        <span className="label">Lover</span>
                        <span className="desc">Flirty & sweet</span>
                      </button>
                      <button className="popup-persona-card" onClick={() => handlePersonaSelect('business_partner')}>
                        <span className="emoji">💼</span>
                        <span className="label">Business</span>
                        <span className="desc">Professional</span>
                      </button>
                      <button className="popup-persona-card" onClick={() => handlePersonaSelect('stranger')}>
                        <span className="emoji">😂</span>
                        <span className="label">Comedian</span>
                        <span className="desc">Hilarious</span>
                      </button>
                      <button className="popup-persona-card" onClick={() => handlePersonaSelect('celebrity')}>
                        <span className="emoji">⭐</span>
                        <span className="label">Celebrity</span>
                        <span className="desc">Dramatic</span>
                      </button>
                      <button className="popup-persona-card" onClick={() => handlePersonaSelect('therapist')}>
                        <span className="emoji">🧠</span>
                        <span className="label">Therapist</span>
                        <span className="desc">Supportive</span>
                      </button>
                      <button className="popup-persona-card" onClick={() => handlePersonaSelect('drunk_uncle')}>
                        <span className="emoji">🍺</span>
                        <span className="label">Uncle</span>
                        <span className="desc">Chaotic</span>
                      </button>
                    </div>

                    <button className="popup-maybe-later" onClick={handleMaybeLater}>
                      Maybe Later
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Full Screen Chat */}
      {step === 'chatting' && order && selectedPersona && (
        <ChatBot 
          order={order} 
          initialPersona={selectedPersona}
          onClose={handleChatClose}
          onStopSpeech={stopSpeech}
        />
      )}
    </div>
  );
}