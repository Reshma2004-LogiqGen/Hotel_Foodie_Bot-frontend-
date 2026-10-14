import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Info, Plus, Power, Printer, QrCode, RefreshCw, ScanLine, Trash } from 'lucide-react';
import { adminApi, errorMessage } from '../api';
import { formatScanTime } from '../format';
import { QR_POINTS_TO_LOCALHOST, downloadQrCard, tableUrl } from '../qr';
import type { DiningTable } from '../types';
import AddTablesModal from '../components/AddTablesModal';
import QrPrintSheet from '../components/QrPrintSheet';
import { useToast } from '../components/Toast';
import { ActionMenu, ConfirmDialog, EmptyState, PageHeader, Spinner } from '../components/ui';

const REFRESH_INTERVAL_MS = 30_000;

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

function describeNumbers(numbers: number[]) {
  const contiguous = numbers.every((n, i) => i === 0 || n === numbers[i - 1] + 1);
  if (numbers.length === 1) return `table ${numbers[0]}`;
  if (contiguous) return `tables ${numbers[0]}–${numbers[numbers.length - 1]}`;
  return `tables ${numbers.join(', ')}`;
}

function TableCard({ table, onToggle, onRegenerate, onDelete, onPrint }: {
  table: DiningTable;
  onToggle: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onPrint: () => void;
}) {
  const toast = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!svgRef.current) return;
    setDownloading(true);
    try {
      await downloadQrCard(table.number, table.pin, svgRef.current);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className={`adm-card adm-table-card ${table.isActive ? '' : 'is-inactive'}`}>
      <header className="adm-table-header">
        <div className="adm-table-title">
          <h3>Table {table.number}</h3>
          <span className={`adm-badge ${table.isActive ? 'adm-badge--success' : 'adm-badge--muted'}`}>
            {table.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <ActionMenu
          label={`Table ${table.number} options`}
          actions={[
            { label: table.isActive ? 'Deactivate' : 'Activate', icon: Power, onSelect: onToggle },
            { label: 'New QR code', icon: RefreshCw, onSelect: onRegenerate },
            { label: 'Delete table', icon: Trash, onSelect: onDelete, danger: true },
          ]}
        />
      </header>

      <div className="adm-qr">
        <QRCodeSVG ref={svgRef} value={tableUrl(table)} size={148} level="M" marginSize={2} title={`QR code for table ${table.number}`} />
      </div>

      <p className="adm-table-pin" title="Customers who can't scan type the table number and this PIN">
        Table PIN <strong>{table.pin}</strong>
      </p>

      <p className="adm-table-stats">
        <ScanLine size={15} />
        {table.lastScannedAt
          ? `${table.scansToday} ${table.scansToday === 1 ? 'scan' : 'scans'} today · Last ${formatScanTime(table.lastScannedAt)}`
          : 'No scans yet'}
      </p>

      <footer className="adm-table-actions">
        <button className="adm-btn adm-btn--outline adm-btn--sm" onClick={download} disabled={downloading}>
          {downloading ? <Spinner size={16} /> : <Download size={16} />} Download
        </button>
        <button className="adm-btn adm-btn--outline adm-btn--sm" onClick={onPrint}>
          <Printer size={16} /> Print
        </button>
      </footer>
    </article>
  );
}

export default function TablesPage() {
  const toast = useToast();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [printJob, setPrintJob] = useState<{ id: number; tables: DiningTable[] } | null>(null);
  const printJobId = useRef(0);

  const print = (list: DiningTable[]) => setPrintJob({ id: ++printJobId.current, tables: list });

  const load = useCallback(async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
      setLoadError('');
    }
    try {
      setTables(await adminApi.listTables());
      setLoadError('');
    } catch (err) {
      if (!quiet) setLoadError(errorMessage(err));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  const replaceTable = (updated: DiningTable) =>
    setTables(current => current.map(t => (t.id === updated.id ? updated : t)));

  const toggleTable = async (table: DiningTable) => {
    try {
      const updated = await adminApi.updateTable(table.id, { isActive: !table.isActive });
      replaceTable(updated);
      toast.success(updated.isActive ? `Table ${table.number} is active` : `Table ${table.number} deactivated`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const confirmRegenerate = (table: DiningTable) => setPendingConfirm({
    title: `New QR code for table ${table.number}?`,
    message: 'The QR code and PIN already printed for this table will stop working. Print and place the new card.',
    confirmLabel: 'Create new QR code',
    action: async () => {
      replaceTable(await adminApi.regenerateTableCode(table.id));
      toast.success(`New QR code ready for table ${table.number}`);
    },
  });

  const confirmDelete = (table: DiningTable) => setPendingConfirm({
    title: `Delete table ${table.number}?`,
    message: 'Its QR code will stop working and its scan history will be removed.',
    confirmLabel: 'Delete table',
    action: async () => {
      await adminApi.deleteTable(table.id);
      setTables(current => current.filter(t => t.id !== table.id));
      toast.success(`Table ${table.number} deleted`);
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

  const handleAdded = ({ created, skipped }: { created: number[]; skipped: number[] }) => {
    setAddOpen(false);
    if (created.length) {
      toast.success(`Added ${describeNumbers(created)}${skipped.length ? ` (${skipped.length} already existed)` : ''}`);
      load(true);
    } else {
      toast.error('Those tables already exist.');
    }
  };

  const printAll = () => {
    const active = tables.filter(t => t.isActive);
    if (!active.length) {
      toast.error('There are no active tables to print.');
      return;
    }
    print(active);
  };

  const finishPrinting = useCallback(() => setPrintJob(null), []);

  if (loading) {
    return <div className="adm-page-loading"><Spinner size={28} /></div>;
  }

  if (loadError) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Couldn't load tables"
        text={loadError}
        action={<button className="adm-btn adm-btn--primary" onClick={() => load()}>Try again</button>}
      />
    );
  }

  const activeCount = tables.filter(t => t.isActive).length;
  const scansToday = tables.reduce((sum, t) => sum + t.scansToday, 0);
  const nextNumber = Math.min((tables[tables.length - 1]?.number ?? 0) + 1, 999);

  return (
    <>
      <PageHeader
        title="Tables & QR"
        subtitle={`${tables.length} ${tables.length === 1 ? 'table' : 'tables'} · ${activeCount} active · ${scansToday} ${scansToday === 1 ? 'scan' : 'scans'} today`}
        actions={
          <>
            <button className="adm-btn adm-btn--secondary" onClick={printAll} disabled={!tables.length}>
              <Printer size={18} /> Print all
            </button>
            <button className="adm-btn adm-btn--primary" onClick={() => setAddOpen(true)}>
              <Plus size={18} /> Add tables
            </button>
          </>
        }
      />

      {QR_POINTS_TO_LOCALHOST && tables.length > 0 && (
        <div className="adm-notice">
          <Info size={18} />
          <p>
            These QR codes point to <strong>localhost</strong>, which phones can't open. Before printing, open this
            dashboard using the <strong>Network</strong> address shown when you run <code>npm run dev</code>.
          </p>
        </div>
      )}

      {tables.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No tables yet"
          text="Add your tables to create a QR code for each one."
          action={<button className="adm-btn adm-btn--primary" onClick={() => setAddOpen(true)}><Plus size={18} /> Add tables</button>}
        />
      ) : (
        <div className="adm-table-grid">
          {tables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onToggle={() => toggleTable(table)}
              onRegenerate={() => confirmRegenerate(table)}
              onDelete={() => confirmDelete(table)}
              onPrint={() => print([table])}
            />
          ))}
        </div>
      )}

      <AddTablesModal open={addOpen} nextNumber={nextNumber} onClose={() => setAddOpen(false)} onAdded={handleAdded} />

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.title ?? ''}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel ?? ''}
        onConfirm={runConfirm}
        onClose={() => setPendingConfirm(null)}
      />

      {printJob && <QrPrintSheet key={printJob.id} tables={printJob.tables} onDone={finishPrinting} />}
    </>
  );
}
