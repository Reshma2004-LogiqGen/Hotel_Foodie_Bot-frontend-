import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { tableUrl } from '../qr';
import type { DiningTable } from '../types';

/** Renders printable QR cards and opens the browser print dialog. */
export default function QrPrintSheet({ tables, onDone }: { tables: DiningTable[]; onDone: () => void }) {
  useEffect(() => {
    const finish = () => onDone();
    window.addEventListener('afterprint', finish);
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', finish);
    };
  }, [onDone]);

  return createPortal(
    <div className="adm-print-sheet">
      {tables.map(table => (
        <div key={table.id} className="adm-print-card">
          <p className="adm-print-brand">Food Friend</p>
          <p className="adm-print-table">Table {table.number}</p>
          <QRCodeSVG value={tableUrl(table)} size={200} level="M" marginSize={2} />
          <p className="adm-print-hint">Scan to view the menu &amp; order</p>
          <p className="adm-print-pin">Can't scan? Enter table {table.number} and PIN <strong>{table.pin}</strong></p>
        </div>
      ))}
    </div>,
    document.body,
  );
}
