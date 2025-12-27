import { useState, useEffect } from 'react';
import '../styles/ChefPortalPage.css';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  emoji?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  tableNumber?: number;
  createdAt: string;
}

// Dynamic API URL - works on both localhost and network IP
const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return `http://${hostname}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();

export default function ChefPortalPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      console.log('📥 Fetching orders from:', `${API_BASE_URL}/orders`);
      const response = await fetch(`${API_BASE_URL}/orders`);
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Orders received:', data);
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      console.log('📤 Updating order status:', orderId, newStatus);
      const response = await fetch(`${API_BASE_URL}/order/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        console.log('✅ Order status updated');
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#fbbf24';
      case 'preparing': return '#3b82f6';
      case 'ready': return '#22c55e';
      case 'delivered': return '#8b5cf6';
      default: return '#71717a';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'confirmed': return '📋';
      case 'preparing': return '👨‍🍳';
      case 'ready': return '🔔';
      case 'delivered': return '✅';
      default: return '📦';
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const statusCounts = {
    all: orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <div className="chef-portal-page">
      {/* Header */}
      <header className="chef-header">
        <div className="chef-logo">
          <span className="chef-emoji">👨‍🍳</span>
          <div>
            <h1>Chef Portal</h1>
            <p>Kitchen Order Management</p>
          </div>
        </div>
        <div className="live-badge">
          <span className="pulse"></span>
          LIVE
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Orders ({statusCounts.all})
        </button>
        <button 
          className={`filter-tab ${filter === 'confirmed' ? 'active' : ''}`}
          onClick={() => setFilter('confirmed')}
        >
          📋 New ({statusCounts.confirmed})
        </button>
        <button 
          className={`filter-tab ${filter === 'preparing' ? 'active' : ''}`}
          onClick={() => setFilter('preparing')}
        >
          👨‍🍳 Preparing ({statusCounts.preparing})
        </button>
        <button 
          className={`filter-tab ${filter === 'ready' ? 'active' : ''}`}
          onClick={() => setFilter('ready')}
        >
          🔔 Ready ({statusCounts.ready})
        </button>
        <button 
          className={`filter-tab ${filter === 'delivered' ? 'active' : ''}`}
          onClick={() => setFilter('delivered')}
        >
          ✅ Done ({statusCounts.delivered})
        </button>
      </div>

      {/* Orders Grid */}
      <main className="orders-container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">📭</span>
            <h2>No orders</h2>
            <p>Waiting for new orders...</p>
          </div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map((order) => (
              <div key={order.id} className={`order-card status-${order.status}`}>
                <div className="order-header">
                  <span className="order-id">{order.id}</span>
                  <span 
                    className="order-status"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusEmoji(order.status)} {order.status}
                  </span>
                </div>

                {order.tableNumber && (
                  <div className="table-number">
                    🪑 Table #{order.tableNumber}
                  </div>
                )}

                <div className="order-time">
                  🕐 {new Date(order.createdAt).toLocaleTimeString()}
                </div>

                <div className="order-items">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="order-item">
                      <span className="item-emoji">{item.emoji || '🍽️'}</span>
                      <span className="item-name">{item.name}</span>
                      <span className="item-qty">×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="order-total">
                  Total: ${order.total.toFixed(2)}
                </div>

                <div className="status-actions">
                  {order.status === 'confirmed' && (
                    <button 
                      className="action-btn preparing"
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                    >
                      👨‍🍳 Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button 
                      className="action-btn ready"
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                    >
                      🔔 Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      className="action-btn delivered"
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                    >
                      ✅ Mark Delivered
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <span className="completed-badge">Completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
