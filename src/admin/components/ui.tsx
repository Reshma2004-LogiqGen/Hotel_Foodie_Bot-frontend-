import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EllipsisVertical, LoaderCircle, X, type LucideIcon } from 'lucide-react';
import { useBackButton } from '../../shared/backButton';

export function Spinner({ size = 18 }: { size?: number }) {
  return <LoaderCircle size={size} className="adm-spin" aria-hidden />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="adm-page-header">
      <div>
        <h1 className="adm-page-title">{title}</h1>
        {subtitle && <p className="adm-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="adm-page-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="adm-empty">
      <div className="adm-empty-icon"><Icon size={26} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`adm-switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="adm-switch-thumb" />
    </button>
  );
}

export function VegMark({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`adm-veg-mark ${isVeg ? 'is-veg' : 'is-nonveg'}`}
      title={isVeg ? 'Veg' : 'Non-veg'}
      aria-label={isVeg ? 'Veg' : 'Non-veg'}
    />
  );
}

function useEscape(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

export function Modal({ open, title, onClose, children, footer }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEscape(open, onClose);
  useBackButton(open, onClose);
  if (!open) return null;
  return (
    <div className="adm-overlay" onMouseDown={onClose}>
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h2>{title}</h2>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="adm-modal-body">{children}</div>
        {footer && <div className="adm-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose }: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button className="adm-btn adm-btn--outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="adm-btn adm-btn--danger" onClick={confirm} disabled={busy}>
            {busy && <Spinner size={16} />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="adm-confirm-text">{message}</p>
    </Modal>
  );
}

export interface MenuAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function ActionMenu({ actions, label }: { actions: MenuAction[]; label: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEscape(open, () => setOpen(false));
  useBackButton(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div className="adm-menu" ref={rootRef}>
      <button
        className="adm-icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={event => {
          event.stopPropagation();
          setOpen(o => !o);
        }}
      >
        <EllipsisVertical size={18} />
      </button>
      {open && (
        <div className="adm-menu-list" role="menu">
          {actions.map(({ label, icon: Icon, onSelect, danger, disabled }) => (
            <button
              key={label}
              role="menuitem"
              disabled={disabled}
              className={`adm-menu-item ${danger ? 'is-danger' : ''}`}
              onClick={event => {
                event.stopPropagation();
                setOpen(false);
                onSelect();
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
