import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  BellRing, Check, ChefHat, ClipboardCheck, HandPlatter, MessageCircleHeart, NotebookPen, Plus, ReceiptText,
} from 'lucide-react';
import { formatPrice } from '../../admin/format';
import { getOrder } from '../api';
import { speak, stopSpeech } from '../personas';
import type { Dish, OrderStatus, PersonaId, PlacedOrder } from '../types';
import ChatInvite from './ChatInvite';
import ChatScreen from './ChatScreen';
import NutritionCard from './NutritionCard';
import { DishImage, VegMark } from './ui';

const POLL_MS = 5000;
const INVITE_DELAY_MS = 6000;
const MAX_DECLINES = 3;

const STEPS: { status: OrderStatus; title: string; text: string }[] = [
  { status: 'received', title: 'Order received', text: 'The kitchen has your order.' },
  { status: 'preparing', title: 'Being prepared', text: 'Our chefs are cooking your food.' },
  { status: 'ready', title: 'Ready to serve', text: 'Your food is on its way to your table.' },
  { status: 'served', title: 'Served', text: 'Enjoy your meal!' },
];

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

interface OrderViewProps {
  order: PlacedOrder;
  code: string;
  dishes: Map<number, Dish>;
  restaurantName: string;
  onOrderChange: Dispatch<SetStateAction<PlacedOrder | null>>;
  onNewOrder: () => void;
}

export default function OrderView({ order, code, dishes, restaurantName, onOrderChange, onNewOrder }: OrderViewProps) {
  const [reconnecting, setReconnecting] = useState(false);
  const [nutritionReady, setNutritionReady] = useState(false);
  const [invite, setInvite] = useState<'prompt' | 'personas' | null>(null);
  const [declines, setDeclines] = useState(0);
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const invitedKey = `ff_invited:${order.orderNumber}`;

  const served = order.status === 'served';
  const stepIndex = STEPS.findIndex(step => step.status === order.status);
  const eta = Math.max(10, ...order.items.map(item => (item.menuItemId && dishes.get(item.menuItemId)?.prepMinutes) || 0));
  useEffect(() => {
    if (served) return;
    const timer = window.setInterval(async () => {
      try {
        const fresh = await getOrder(order.orderNumber, code);
        setReconnecting(false);
        onOrderChange(prev => (prev && prev.updatedAt === fresh.updatedAt && prev.status === fresh.status ? prev : fresh));
      } catch {
        setReconnecting(true);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [order.orderNumber, code, served, onOrderChange]);

  // Invite the guest to chat a few seconds after their nutrition shows up (once per order).
  useEffect(() => {
    if (!nutritionReady || served || sessionStorage.getItem(invitedKey)) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(invitedKey, '1');
      setInvite('prompt');
    }, INVITE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [nutritionReady, served, invitedKey]);

  useEffect(() => stopSpeech, []);

  const declineChat = () => {
    const count = declines + 1;
    setDeclines(count);
    if (count === 2) speak("Oh come on! You're breaking my heart here! I promise I'm fun to talk to!");
    if (count >= MAX_DECLINES) setInvite(null);
  };

  const closeInvite = () => {
    stopSpeech();
    setInvite(null);
  };

  const pickPersona = (id: PersonaId) => {
    stopSpeech();
    setInvite(null);
    setPersona(id);
  };

  const hero = {
    received: { icon: ClipboardCheck, title: 'Order placed!', text: 'The kitchen has your order and will start cooking soon.' },
    preparing: { icon: ChefHat, title: 'Your food is cooking', text: `Our chefs are on it. Usually ready in about ${eta} min.` },
    ready: { icon: BellRing, title: 'Your food is ready!', text: `It's on its way to Table ${order.tableNumber}.` },
    served: { icon: HandPlatter, title: 'Enjoy your meal!', text: `Thank you for dining at ${restaurantName}.` },
  }[order.status];
  const HeroIcon = hero.icon;

  return (
    <main className="cx-page cx-order">
      <div className="cx-order-grid">
        <div className="cx-order-main">
          <section className={`cx-status-card is-${order.status}`}>
            <span className="cx-status-icon"><HeroIcon size={30} /></span>
            <h1>{hero.title}</h1>
            <p>{hero.text}</p>
            <div className="cx-status-meta">
              <span>Order #{order.orderNumber}</span>
              <span>Table {order.tableNumber}</span>
              <span>Placed {formatTime(order.createdAt)}</span>
            </div>
            {served ? (
              <button type="button" className="cx-btn cx-btn--primary" onClick={onNewOrder}>
                <Plus size={18} /> Order something else
              </button>
            ) : (
              <span className={`cx-live ${reconnecting ? 'is-off' : ''}`}>
                <span className="cx-live-dot" />
                {reconnecting ? 'Reconnecting...' : 'Live updates'}
              </span>
            )}
          </section>

          <section className="cx-card">
            <h2 className="cx-card-title">Track order</h2>
            <ol className="cx-timeline">
              {STEPS.map((step, index) => {
                const state = index < stepIndex || served ? 'done' : index === stepIndex ? 'current' : 'todo';
                const time = index === 0 ? order.createdAt : index === stepIndex ? order.updatedAt : null;
                return (
                  <li key={step.status} className={`cx-timeline-step is-${state}`}>
                    <span className="cx-timeline-dot">
                      {state === 'done' && <Check size={16} strokeWidth={3} />}
                    </span>
                    <div>
                      <strong>{step.title}</strong>
                      <span>{step.text}</span>
                    </div>
                    {time && state !== 'todo' && <time>{formatTime(time)}</time>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <div className="cx-order-side">
          <section className="cx-card">
            <div className="cx-card-head">
              <span className="cx-card-icon"><ReceiptText size={18} /></span>
              <div>
                <h2>Your order</h2>
                <p>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
              </div>
            </div>
            <ul className="cx-order-items">
              {order.items.map(item => {
                const dish = item.menuItemId ? dishes.get(item.menuItemId) : undefined;
                return (
                  <li key={item.id}>
                    <DishImage src={dish?.imageUrl ?? null} alt={item.name} className="cx-order-photo" />
                    <div className="cx-order-item-info">
                      <div className="cx-dish-title">
                        {dish && <VegMark isVeg={dish.isVeg} />}
                        <h3>{item.name}</h3>
                      </div>
                      <span>{item.quantity} × {formatPrice(item.unitPrice)}</span>
                      {item.notes && <em>{item.notes}</em>}
                    </div>
                    <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                  </li>
                );
              })}
            </ul>
            {order.notes && (
              <p className="cx-order-notes"><NotebookPen size={15} /> {order.notes}</p>
            )}
            <div className="cx-bill-row cx-bill-total">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </section>

          <NutritionCard orderNumber={order.orderNumber} code={code} onLoaded={() => setNutritionReady(true)} />

          {!served && (
            <section className="cx-card cx-chat-card">
              <span className="cx-card-icon"><MessageCircleHeart size={20} /></span>
              <div>
                <h2>Chat while you wait</h2>
                <p>Pick a fun chat buddy to talk to until your food arrives.</p>
              </div>
              <button type="button" className="cx-btn cx-btn--primary" onClick={() => setInvite('personas')}>
                Start a chat
              </button>
            </section>
          )}
        </div>
      </div>

      {invite && (
        <ChatInvite
          step={invite}
          declines={declines}
          onYes={() => setInvite('personas')}
          onNo={declineChat}
          onBack={() => setInvite('prompt')}
          onPick={pickPersona}
          onClose={closeInvite}
        />
      )}

      {persona && (
        <ChatScreen persona={persona} orderNumber={order.orderNumber} code={code} onClose={() => setPersona(null)} />
      )}
    </main>
  );
}
