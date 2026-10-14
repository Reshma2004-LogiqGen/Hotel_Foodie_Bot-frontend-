import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, errorMessage } from '../api';
import { Modal, Spinner } from './ui';

const MAX_TABLE_NUMBER = 999;
const MAX_TABLES_AT_ONCE = 100;

export default function AddTablesModal({ open, nextNumber, onClose, onAdded }: {
  open: boolean;
  nextNumber: number;
  onClose: () => void;
  onAdded: (result: { created: number[]; skipped: number[] }) => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFrom(String(nextNumber));
      setTo(String(nextNumber));
      setError('');
      setSaving(false);
    }
  }, [open, nextNumber]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const start = Number(from);
    const end = Number(to);
    if (![start, end].every(n => Number.isInteger(n) && n >= 1 && n <= MAX_TABLE_NUMBER)) {
      setError(`Use table numbers from 1 to ${MAX_TABLE_NUMBER}.`);
      return;
    }
    if (end < start) {
      setError('"To" must be the same as or higher than "From".');
      return;
    }
    if (end - start + 1 > MAX_TABLES_AT_ONCE) {
      setError(`You can add up to ${MAX_TABLES_AT_ONCE} tables at a time.`);
      return;
    }

    setError('');
    setSaving(true);
    try {
      onAdded(await adminApi.createTables(start, end));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const count = Number(to) - Number(from) + 1;

  return (
    <Modal
      open={open}
      title="Add tables"
      onClose={onClose}
      footer={
        <>
          <button className="adm-btn adm-btn--outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="adm-btn adm-btn--primary" type="submit" form="adm-tables-form" disabled={saving}>
            {saving && <Spinner size={16} />}
            {Number.isInteger(count) && count > 1 ? `Add ${count} tables` : 'Add table'}
          </button>
        </>
      }
    >
      <form id="adm-tables-form" onSubmit={handleSubmit} noValidate>
        <div className="adm-field-row">
          <label className="adm-field">
            <span className="adm-label">From table</span>
            <input className="adm-input" type="number" min="1" max={MAX_TABLE_NUMBER} value={from} onChange={e => setFrom(e.target.value)} autoFocus />
          </label>
          <label className="adm-field">
            <span className="adm-label">To table</span>
            <input className="adm-input" type="number" min="1" max={MAX_TABLE_NUMBER} value={to} onChange={e => setTo(e.target.value)} />
          </label>
        </div>
        {error ? <p className="adm-field-error">{error}</p> : <p className="adm-hint">Table numbers that already exist are skipped.</p>}
      </form>
    </Modal>
  );
}
