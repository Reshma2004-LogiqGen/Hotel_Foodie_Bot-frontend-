import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { QrCode, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError, checkTable, getMenu, placeOrder } from '../api';
import type { Cart, Dish, Menu, PlacedOrder } from '../types';
import CustomerHeader from '../components/CustomerHeader';
import MenuView from '../components/MenuView';
import CartSheet from '../components/CartSheet';
import OrderView from '../components/OrderView';
import ScrollRail from '../components/ScrollRail';
import { MessageScreen, Spinner } from '../components/ui';

const cartKey = (code: string) => `ff_cart:${code}`;

function readCart(code: string): Cart {
  try {
    const saved = JSON.parse(sessionStorage.getItem(cartKey(code)) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

export default function TablePage() {
  const { number: numberParam } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const tableNumber = Number(numberParam);
  const hasValidLink = Boolean(code) && Number.isInteger(tableNumber) && tableNumber > 0;

  const [menu, setMenu] = useState<Menu | null>(null);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loading, setLoading] = useState(hasValidLink);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [cart, setCart] = useState<Cart>(() => readCart(code));
  const [cartOpen, setCartOpen] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const dishes = useMemo(() => {
    const map = new Map<number, Dish>();
    menu?.categories.forEach(category => category.items.forEach(dish => map.set(dish.id, dish)));
    return map;
  }, [menu]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [table, menuData] = await Promise.all([checkTable(tableNumber, code), getMenu(code)]);
      setMenu(menuData);
      // Until it's served, every scan of this table opens its order; after that the table starts fresh.
      setOrder(table.activeOrder);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err : new ApiError('Something went wrong. Please try again.', 0));
    } finally {
      setLoading(false);
    }
  }, [code, tableNumber]);

  useEffect(() => {
    const key = `${tableNumber}:${code}`;
    if (!hasValidLink || loadedFor.current === key) return;
    loadedFor.current = key;
    void load();
  }, [code, tableNumber, hasValidLink, load]);

  useEffect(() => {
    if (menu) document.title = `${menu.restaurant.name} · Table ${tableNumber}`;
  }, [menu, tableNumber]);

  // Drop dishes that left the menu or sold out since the cart was saved.
  useEffect(() => {
    if (!menu) return;
    setCart(prev => {
      const kept = Object.fromEntries(
        Object.entries(prev).filter(([id, qty]) => dishes.get(Number(id))?.isAvailable && qty > 0),
      );
      return Object.keys(kept).length === Object.keys(prev).length ? prev : kept;
    });
  }, [menu, dishes]);

  useEffect(() => {
    if (code) sessionStorage.setItem(cartKey(code), JSON.stringify(cart));
  }, [cart, code]);

  const changeQuantity = useCallback((dishId: number, delta: number) => {
    setCart(prev => {
      const quantity = Math.min(20, (prev[dishId] ?? 0) + delta);
      const next = { ...prev };
      if (quantity > 0) next[dishId] = quantity;
      else delete next[dishId];
      return next;
    });
  }, []);

  const submitOrder = async (notes: string) => {
    let placed: PlacedOrder;
    try {
      placed = await placeOrder(tableNumber, code, cart, notes);
    } catch (err) {
      const activeOrder = err instanceof ApiError && err.status === 409
        ? (err.data as { activeOrder?: PlacedOrder } | null)?.activeOrder
        : undefined;
      if (!activeOrder) throw err;
      placed = activeOrder;
    }
    setOrder(placed);
    setCart({});
    setCartOpen(false);
    window.scrollTo({ top: 0 });
  };

  const startNewOrder = () => {
    setOrder(null);
    window.scrollTo({ top: 0 });
  };

  if (!hasValidLink) {
    return (
      <div className="cx-app">
        <MessageScreen
          icon={<QrCode size={28} />}
          title="Scan your table's QR code"
          action={<Link className="cx-btn cx-btn--primary" to="/">Open scanner</Link>}
        >
          This link is incomplete. Please scan the QR code on your table again.
        </MessageScreen>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cx-app cx-center-screen">
        <Spinner label="Getting the menu ready..." />
      </div>
    );
  }

  if (loadError || !menu) {
    const offline = !loadError || loadError.status === 0 || loadError.status >= 500;
    return (
      <div className="cx-app">
        <MessageScreen
          icon={offline ? <WifiOff size={28} /> : <QrCode size={28} />}
          title={offline ? "We couldn't load the menu" : 'Please ask the staff'}
          action={offline ? (
            <>
              <button type="button" className="cx-btn cx-btn--primary" onClick={() => void load()}>
                <RefreshCw size={18} /> Try again
              </button>
              <Link className="cx-btn cx-btn--ghost" to="/">Back to scanner</Link>
            </>
          ) : (
            <Link className="cx-btn cx-btn--outline" to="/">Scan again</Link>
          )}
        >
          {loadError?.message}
        </MessageScreen>
      </div>
    );
  }

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="cx-app">
      <ScrollRail />
      <CustomerHeader
        restaurant={menu.restaurant}
        tableNumber={tableNumber}
        cartCount={order ? undefined : cartCount}
        onCartClick={() => setCartOpen(true)}
      />

      {order ? (
        <OrderView
          order={order}
          code={code}
          dishes={dishes}
          restaurantName={menu.restaurant.name}
          onOrderChange={setOrder}
          onNewOrder={startNewOrder}
        />
      ) : (
        <>
          <MenuView
            menu={menu}
            tableNumber={tableNumber}
            cart={cart}
            dishes={dishes}
            onChangeQuantity={changeQuantity}
            onOpenCart={() => setCartOpen(true)}
          />
          <CartSheet
            open={cartOpen}
            tableNumber={tableNumber}
            cart={cart}
            dishes={dishes}
            onClose={() => setCartOpen(false)}
            onChangeQuantity={changeQuantity}
            onClear={() => setCart({})}
            onPlaceOrder={submitOrder}
          />
        </>
      )}
    </div>
  );
}
