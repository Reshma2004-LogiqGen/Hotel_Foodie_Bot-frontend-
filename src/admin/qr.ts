import type { DiningTable } from './types';

const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '');

export const QR_POINTS_TO_LOCALHOST = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(PUBLIC_APP_URL).hostname);

export function tableUrl(table: Pick<DiningTable, 'number' | 'code'>) {
  return `${PUBLIC_APP_URL}/t/${table.number}?code=${encodeURIComponent(table.code)}`;
}

/** Save a print-ready PNG card ("Table 5" + QR code + PIN) built from the rendered QR <svg>. */
export async function downloadQrCard(tableNumber: number, pin: string, svg: SVGSVGElement) {
  const markup = new XMLSerializer().serializeToString(svg);
  const qrImage = new Image();
  qrImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await Promise.all([qrImage.decode(), document.fonts.ready]);

  const width = 800;
  const height = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create the image.');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';

  ctx.fillStyle = '#E11D48';
  ctx.font = '600 34px Poppins, sans-serif';
  ctx.fillText('Food Friend', width / 2, 90);

  ctx.fillStyle = '#1F2937';
  ctx.font = '700 72px Poppins, sans-serif';
  ctx.fillText(`Table ${tableNumber}`, width / 2, 185);

  ctx.drawImage(qrImage, 130, 235, 540, 540);

  ctx.fillStyle = '#6B7280';
  ctx.font = '500 30px Inter, sans-serif';
  ctx.fillText('Scan to view the menu & order', width / 2, 835);

  ctx.fillStyle = '#1F2937';
  ctx.font = '600 34px Inter, sans-serif';
  ctx.fillText(`Can't scan? Table ${tableNumber} · PIN ${pin}`, width / 2, 910);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Your browser could not create the image.');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `table-${tableNumber}-qr.png`;
  link.click();
  URL.revokeObjectURL(link.href);
}
