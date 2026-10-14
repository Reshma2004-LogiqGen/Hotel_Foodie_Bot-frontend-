import { useCallback, useEffect, useState } from 'react';
import { BellRing, ClipboardList, Clock, Flame, HandPlatter, MessageSquareText, RefreshCw, Undo2, type LucideIcon } from 'lucide-react';
import { adminApi, errorMessage } from '../api';
import { formatScanTime } from '../format';
import type { KitchenOrder, OrderStatus } from '../types';
import { useToast } from '../components/Toast';
import { EmptyState, PageHeader, Spinner } from '../components/ui';

const REFRESH_INTERVAL_MS = 5_000;
const CLOCK_TICK_MS = 30_000;
const LATE_AFTER_MINUTES = 20;

interface Column {
  status: Exclude<OrderStatus, 'served'>;
  title: string;
  empty: string;
  next: OrderStatus;
  actionLabel: string;
  actionIcon: LucideIcon;
  previous?: OrderStatus;
}

const COLUMNS: Column[] = [
  { status: 'received', title: 'New', empty: 'No new orders', next: 'preparing', actionLabel: 'Start preparing', actionIcon: Flame },
  { status: 'preparing', title: 'Preparing', empty: 'Nothing on the stove', next: 'ready', actionLabel: 'Mark ready', actionIcon: BellRing, previous: 'received' },
  { status: 'ready', title: 'Ready to serve', empty: 'Nothing waiting', next: 'served', actionLabel: 'Served', actionIcon: HandPlatter, previous: 'preparing' },
];

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

function OrderCard({ order, column, now, busy, onMove }: {
  order: KitchenOrder;
  column: Column;
  now: number;
  busy: boolean;
  onMove: (status: OrderStatus) => void;
}) {
  const minutes = minutesSince(order.createdAt, now);
  const ActionIcon = column.actionIcon;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article className={`adm-card adm-order-card is-${order.status}`}>
      <header className="adm-order-header">
        <div>
          <h3>Table {order.tableNumber}</h3>
          <span className="adm-order-number">#{order.orderNumber} · {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>
        <span className={`adm-order-time ${minutes >= LATE_AFTER_MINUTES ? 'is-late' : ''}`} title={`Ordered at ${formatScanTime(order.createdAt)}`}>
          <Clock size={14} /> {minutes < 1 ? 'Just now' : `${minutes} min`}
        </span>
      </header>

      <ul className="adm-order-items">
        {order.items.map(item => (
          <li key={item.id}>
            <span className="adm-order-qty">{item.quantity}×</span>
            <span className="adm-order-item-name">
              {item.name}
              {item.notes && <em>{item.notes}</em>}
            </span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="adm-order-notes"><MessageSquareText size={15} /> {order.notes}</p>
      )}

      <footer className="adm-order-actions">
        {column.previous && (
          <button
            className="adm-icon-btn"
            onClick={() => onMove(column.previous!)}
            disabled={busy}
            aria-label="Move back one step"
            title="Move back"
          >
            <Undo2 size={18} />
          </button>
        )}
        <button className="adm-btn adm-btn--primary adm-btn--block" onClick={() => onMove(column.next)} disabled={busy}>
          {busy ? <Spinner size={16} /> : <ActionIcon size={16} />} {column.actionLabel}
        </button>
      </footer>
    </article>
  );
}

export default function KitchenPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
      setLoadError('');
    }
    try {
      setOrders(await adminApi.listKitchenOrders());
      setLoadError('');
    } catch (err) {
      if (!quiet) setLoadError(errorMessage(err));
    } finally {
      if (!quiet) setLoading(false);
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = window.setInterval(() => load(true), REFRESH_INTERVAL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
  }, [load]);

  const move = async (order: KitchenOrder, status: OrderStatus) => {
    setBusyId(order.id);
    try {
      const updated = await adminApi.updateOrderStatus(order.id, status);
      setOrders(current => current.map(o => (o.id === updated.id ? updated : o)));
      if (status === 'served') toast.success(`Table ${order.tableNumber} served`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="adm-page-loading"><Spinner size={28} /></div>;
  }

  if (loadError) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Couldn't load orders"
        text={loadError}
        action={<button className="adm-btn adm-btn--primary" onClick={() => load()}>Try again</button>}
      />
    );
  }

  const byStatus = (status: OrderStatus) => orders.filter(o => o.status === status);
  const served = byStatus('served').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const openCount = orders.length - served.length;

  return (
    <>
      <PageHeader
        title="Kitchen"
        subtitle={`${openCount} open ${openCount === 1 ? 'order' : 'orders'} · ${served.length} served today`}
        actions={<span className="adm-live"><span className="adm-live-dot" /> Live</span>}
      />

      {openCount === 0 && (
        <div className="adm-notice adm-notice--calm">
          <ClipboardList size={18} />
          <p>No open orders right now. New orders from table QR codes appear here automatically.</p>
        </div>
      )}

      <div className="adm-board">
        {COLUMNS.map(column => {
          const columnOrders = byStatus(column.status);
          return (
            <section key={column.status} className={`adm-board-column is-${column.status}`}>
              <header className="adm-board-header">
                <h2>{column.title}</h2>
                <span className="adm-count">{columnOrders.length}</span>
              </header>
              {columnOrders.length === 0 ? (
                <p className="adm-board-empty">{column.empty}</p>
              ) : (
                columnOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    column={column}
                    now={now}
                    busy={busyId === order.id}
                    onMove={status => move(order, status)}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>

      {served.length > 0 && (
        <section className="adm-card adm-served">
          <header className="adm-staff-section-header">
            <h2><HandPlatter size={18} /> Served today</h2>
            <span className="adm-count">{served.length}</span>
          </header>
          <ul className="adm-served-list">
            {served.map(order => (
              <li key={order.id}>
                <strong>Table {order.tableNumber}</strong>
                <span>#{order.orderNumber}</span>
                <span className="adm-served-items">{order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</span>
                <span className="adm-served-time">{formatScanTime(order.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
