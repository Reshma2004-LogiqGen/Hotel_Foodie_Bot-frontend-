import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, ArrowRight, ChefHat, Hash, QrCode, ScanLine, Smartphone, UtensilsCrossed, X } from 'lucide-react';
import { useBackButton } from '../../shared/backButton';
import { findTable } from '../api';
import ScrollRail from '../components/ScrollRail';
import { BrandLogo, FOOD_PHOTO } from '../components/ui';

const READER_ID = 'cx-qr-reader';
const SCANNING = 2;
const PIN_LENGTH = 4;

const STEPS = [
  { icon: QrCode, title: 'Scan', text: 'or enter your table' },
  { icon: UtensilsCrossed, title: 'Pick', text: 'your favourite dishes' },
  { icon: ChefHat, title: 'Relax', text: "we'll cook & serve" },
];

/** Table QR codes point to /t/<number>?code=<code> on this site. */
function tablePathFrom(text: string) {
  try {
    const url = new URL(text.trim(), window.location.origin);
    const match = url.pathname.match(/^\/t\/(\d+)\/?$/);
    const code = url.searchParams.get('code');
    if (match && code) return `/t/${match[1]}?code=${encodeURIComponent(code)}`;
  } catch {
    // not a URL
  }
  return null;
}

function cameraErrorMessage(err: unknown) {
  const error = err as { name?: string; message?: string };
  if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
    return 'Camera access was blocked. Allow the camera for this site and try again.';
  }
  if (error?.name === 'NotFoundError' || error?.message?.includes('No cameras')) {
    return 'No camera found on this device.';
  }
  if (error?.name === 'NotReadableError') {
    return 'Your camera is being used by another app.';
  }
  if (!window.isSecureContext) {
    return 'The camera only works on a secure (https) link.';
  }
  return "We couldn't start the camera. Try your phone's camera app, or enter your table number.";
}

const digitsOnly = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max);

function TableEntryForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Number(tableNumber) > 0 && pin.length === PIN_LENGTH && !submitting;

  useBackButton(true, onClose);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const table = await findTable(Number(tableNumber), pin);
      // Replace the form's back-button entry so back from the menu returns to this page.
      navigate(`/t/${table.number}?code=${encodeURIComponent(table.code)}`, { replace: true, state: { fromScanner: true } });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <form className="cx-table-entry" onSubmit={submit} noValidate>
      <header>
        <h2>Enter your table</h2>
        <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close table entry">
          <X size={18} />
        </button>
      </header>
      <p>Find the table number and PIN printed under the QR code on your table.</p>

      <div className="cx-table-entry-fields">
        <label className="cx-field">
          <span>Table number</span>
          <input
            value={tableNumber}
            onChange={e => setTableNumber(digitsOnly(e.target.value, 4))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 5"
            autoFocus
          />
        </label>
        <label className="cx-field">
          <span>Table PIN</span>
          <input
            value={pin}
            onChange={e => setPin(digitsOnly(e.target.value, PIN_LENGTH))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="4 digits"
            className="cx-field-pin"
          />
        </label>
      </div>

      {error && (
        <div className="cx-alert" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className="cx-btn cx-btn--primary cx-btn--block cx-btn--lg" disabled={!canSubmit}>
        {submitting ? 'Finding your table...' : 'Open menu'}
        {!submitting && <ArrowRight size={20} />}
      </button>
    </form>
  );
}

export default function ScanPage() {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [mode, setMode] = useState<'idle' | 'starting' | 'scanning'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        if (scanner.getState() === SCANNING) await scanner.stop();
        scanner.clear();
      } catch {
        // already stopped
      }
    }
    setMode('idle');
  };

  useEffect(() => () => { void stopCamera(); }, []);

  const startCamera = async () => {
    setError(null);
    setMode('starting');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10 },
        async decodedText => {
          const path = tablePathFrom(decodedText);
          await stopCamera();
          if (path) {
            navigate(path, { replace: true, state: { fromScanner: true } });
          } else {
            setError("That isn't a table QR code. Please scan the code on your table.");
          }
        },
        () => {},
      );
      setMode('scanning');
    } catch (err) {
      await stopCamera();
      setError(cameraErrorMessage(err));
    }
  };

  const openTableEntry = async () => {
    setError(null);
    await stopCamera();
    setEntryOpen(true);
  };

  const cameraOpen = mode !== 'idle';
  useBackButton(cameraOpen, () => { void stopCamera(); });

  return (
    <div className="cx-app cx-scan">
      <ScrollRail />
      <div className="cx-scan-hero">
        <img src={FOOD_PHOTO} alt="" />
        <div className="cx-scan-hero-shade" />
        <div className="cx-scan-brand">
          <BrandLogo size={40} />
          <span>Food Friend</span>
        </div>
      </div>

      <main className="cx-scan-panel">
        <span className="cx-pill">Good food, good mood</span>
        <h1>
          Scan, Order &amp; <span className="cx-text-primary">Enjoy</span>
        </h1>
        <p className="cx-scan-lead">
          Scan the QR code on your table, or enter your table number, to see the menu and order right from your seat.
        </p>

        {entryOpen && <TableEntryForm onClose={() => setEntryOpen(false)} />}

        <div className={`cx-scanner ${cameraOpen ? 'is-open' : ''}`}>
          <div id={READER_ID} className="cx-scanner-video" />
          {mode === 'starting' && <p className="cx-scanner-status">Starting camera...</p>}
          {mode === 'scanning' && (
            <>
              <div className="cx-scanner-frame" aria-hidden="true">
                <span className="cx-scan-line" />
              </div>
              <button type="button" className="cx-scanner-close" onClick={stopCamera} aria-label="Close camera">
                <X size={20} />
              </button>
            </>
          )}
        </div>

        {mode === 'scanning' ? (
          <p className="cx-scan-hint">Point your camera at the QR code on your table</p>
        ) : !entryOpen && (
          <button type="button" className="cx-btn cx-btn--primary cx-btn--block cx-btn--lg" onClick={startCamera} disabled={mode === 'starting'}>
            <ScanLine size={20} />
            {mode === 'starting' ? 'Opening camera...' : 'Scan table QR'}
          </button>
        )}

        {error && (
          <div className="cx-alert" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {!entryOpen && (
          <>
            <div className="cx-or" aria-hidden="true"><span>or</span></div>
            <button type="button" className="cx-btn cx-btn--outline cx-btn--block cx-btn--lg" onClick={openTableEntry}>
              <Hash size={20} />
              Enter table number
            </button>
          </>
        )}

        <p className="cx-scan-tip">
          <Smartphone size={16} />
          Your phone's camera app can scan it too. It opens the menu directly.
        </p>

        <ol className="cx-steps">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="cx-steps-icon"><Icon size={20} /></span>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
