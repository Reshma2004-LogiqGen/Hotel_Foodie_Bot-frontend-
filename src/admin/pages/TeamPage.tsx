import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ChefHat, Check, Copy, KeyRound, Pencil, RefreshCw, ShieldCheck, Store, Trash, Users, X } from 'lucide-react';
import { adminApi, errorMessage } from '../api';
import { useAuth } from '../auth';
import { formatScanTime } from '../format';
import type { RestaurantSettings, StaffRole, StaffUser } from '../types';
import { useToast } from '../components/Toast';
import { ActionMenu, ConfirmDialog, EmptyState, PageHeader, Spinner } from '../components/ui';

const ROLE_LABELS: Record<StaffRole, string> = { admin: 'Restaurant admin', chef: 'Chef' };

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || '?';
}

function RoleBadge({ role }: { role: StaffRole }) {
  const Icon = role === 'chef' ? ChefHat : ShieldCheck;
  return (
    <span className={`adm-badge ${role === 'chef' ? 'adm-badge--warning' : 'adm-badge--primary'}`}>
      <Icon size={12} /> {ROLE_LABELS[role]}
    </span>
  );
}

function RestaurantCard({ restaurant, onRenamed, onNewCode }: {
  restaurant: RestaurantSettings;
  onRenamed: (updated: RestaurantSettings) => void;
  onNewCode: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Enter a restaurant name.');
      return;
    }
    setSaving(true);
    try {
      onRenamed(await adminApi.renameRestaurant(name.trim()));
      setEditing(false);
      toast.success('Restaurant name saved');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(restaurant.joinCode);
      toast.success('Restaurant code copied');
    } catch {
      toast.error(`Couldn't copy. The code is ${restaurant.joinCode}`);
    }
  };

  return (
    <section className="adm-card adm-restaurant-card">
      <div className="adm-restaurant-name">
        <span className="adm-restaurant-icon"><Store size={22} /></span>
        {editing ? (
          <form className="adm-restaurant-edit" onSubmit={save}>
            <input
              className="adm-input"
              value={name}
              maxLength={100}
              onChange={e => setName(e.target.value)}
              aria-label="Restaurant name"
              autoFocus
            />
            <button type="submit" className="adm-icon-btn" aria-label="Save name" disabled={saving}>
              {saving ? <Spinner size={18} /> : <Check size={18} />}
            </button>
            <button
              type="button"
              className="adm-icon-btn"
              aria-label="Cancel"
              onClick={() => {
                setName(restaurant.name);
                setEditing(false);
              }}
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <div className="adm-restaurant-title">
            <span className="adm-label">Restaurant</span>
            <h2>
              {restaurant.name}
              <button className="adm-icon-btn adm-icon-btn--sm" onClick={() => setEditing(true)} aria-label="Rename restaurant" title="Rename">
                <Pencil size={14} />
              </button>
            </h2>
          </div>
        )}
      </div>

      <div className="adm-join-code">
        <div>
          <span className="adm-label"><KeyRound size={14} /> Restaurant code</span>
          <p className="adm-join-code-value" aria-label={`Restaurant code ${restaurant.joinCode.split('').join(' ')}`}>
            {restaurant.joinCode.split('').map((char, i) => <span key={i}>{char}</span>)}
          </p>
          <p className="adm-hint">Chefs enter this code when they create an account.</p>
        </div>
        <div className="adm-join-code-actions">
          <button className="adm-btn adm-btn--primary adm-btn--sm" onClick={copyCode}>
            <Copy size={16} /> Copy
          </button>
          <button className="adm-btn adm-btn--outline adm-btn--sm" onClick={onNewCode}>
            <RefreshCw size={16} /> New code
          </button>
        </div>
      </div>
    </section>
  );
}

export default function TeamPage() {
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [restaurant, setRestaurant] = useState<RestaurantSettings | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [settings, members] = await Promise.all([adminApi.getRestaurant(), adminApi.listStaff()]);
      setRestaurant(settings);
      setStaff(members);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRenamed = (updated: RestaurantSettings) => {
    setRestaurant(updated);
    if (user) setUser({ ...user, restaurant: { id: updated.id, name: updated.name } });
  };

  const confirmNewCode = () => setPendingConfirm({
    title: 'Make a new restaurant code?',
    message: "The current code will stop working for new sign-ups. People who already joined aren't affected.",
    confirmLabel: 'Make new code',
    action: async () => {
      setRestaurant(await adminApi.regenerateJoinCode());
      toast.success('New restaurant code ready');
    },
  });

  const changeRole = async (person: StaffUser, role: StaffRole) => {
    try {
      const updated = await adminApi.changeStaffRole(person.id, role);
      setStaff(current => current.map(s => (s.id === updated.id ? updated : s)));
      toast.success(`${person.name} is now ${role === 'admin' ? 'a restaurant admin' : 'a chef'}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const confirmRemove = (person: StaffUser) => setPendingConfirm({
    title: `Remove ${person.name}?`,
    message: 'They will be logged out and can no longer sign in to this restaurant.',
    confirmLabel: 'Remove',
    action: async () => {
      await adminApi.removeStaff(person.id);
      setStaff(current => current.filter(s => s.id !== person.id));
      toast.success(`${person.name} was removed`);
    },
  });

  const runConfirm = async () => {
    if (!pendingConfirm) return;
    try {
      await pendingConfirm.action();
      setPendingConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) {
    return <div className="adm-page-loading"><Spinner size={28} /></div>;
  }

  if (loadError || !restaurant) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Couldn't load your team"
        text={loadError}
        action={<button className="adm-btn adm-btn--primary" onClick={load}>Try again</button>}
      />
    );
  }

  const adminCount = staff.filter(s => s.role === 'admin').length;
  const chefCount = staff.length - adminCount;

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${adminCount} ${adminCount === 1 ? 'admin' : 'admins'} · ${chefCount} ${chefCount === 1 ? 'chef' : 'chefs'}`}
      />

      <RestaurantCard restaurant={restaurant} onRenamed={handleRenamed} onNewCode={confirmNewCode} />

      <section className="adm-card adm-staff-section">
        <header className="adm-staff-section-header">
          <h2><Users size={18} /> Members</h2>
          <span className="adm-count">{staff.length}</span>
        </header>
        <ul className="adm-staff-list">
          {staff.map(person => {
            const isYou = person.id === user?.id;
            const otherRole: StaffRole = person.role === 'admin' ? 'chef' : 'admin';
            return (
              <li key={person.id} className="adm-staff-row">
                <span className="adm-avatar">{initials(person.name)}</span>
                <div className="adm-staff-info">
                  <div className="adm-staff-name">
                    <strong>{person.name}</strong>
                    {isYou && <span className="adm-badge adm-badge--muted">You</span>}
                  </div>
                  <span className="adm-staff-email">{person.email}</span>
                </div>
                <div className="adm-staff-meta">
                  <RoleBadge role={person.role} />
                  <span className="adm-staff-time">
                    {person.lastLoginAt ? `Last login ${formatScanTime(person.lastLoginAt)}` : 'Not logged in yet'}
                  </span>
                </div>
                <div className="adm-staff-actions">
                  {!isYou && (
                    <ActionMenu
                      label={`Options for ${person.name}`}
                      actions={[
                        {
                          label: otherRole === 'admin' ? 'Make restaurant admin' : 'Make chef',
                          icon: otherRole === 'admin' ? ShieldCheck : ChefHat,
                          onSelect: () => changeRole(person, otherRole),
                        },
                        { label: 'Remove from team', icon: Trash, onSelect: () => confirmRemove(person), danger: true },
                      ]}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {chefCount === 0 && (
          <p className="adm-staff-empty">
            No chefs yet. Share the restaurant code above and ask them to sign up at <strong>/admin/register</strong>.
          </p>
        )}
      </section>

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel ?? ''}
        onConfirm={runConfirm}
        onClose={() => setPendingConfirm(null)}
      />
    </>
  );
}
