import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';

const MIN_THUMB = 40;
const INSET = 4;
const EDGE_GAP = 2;

interface Metrics {
  top: number;
  height: number;
  right: number;
  thumbTop: number;
  thumbHeight: number;
}

function layout(top: number, height: number, right: number, scrollTop: number, scrollHeight: number, clientHeight: number): Metrics {
  const thumbHeight = Math.max(MIN_THUMB, (height * clientHeight) / scrollHeight);
  const progress = Math.min(1, Math.max(0, scrollTop / (scrollHeight - clientHeight)));
  return { top, height, right, thumbTop: (height - thumbHeight) * progress, thumbHeight };
}

function readMetrics(target: HTMLElement | null): Metrics | null {
  if (target) {
    if (!target.isConnected || target.scrollHeight - target.clientHeight < 2) return null;
    const rect = target.getBoundingClientRect();
    return layout(
      rect.top + INSET, rect.height - INSET * 2, window.innerWidth - rect.right + EDGE_GAP,
      target.scrollTop, target.scrollHeight, target.clientHeight,
    );
  }
  // A sheet or full-screen view has locked the page; it shows its own rail.
  if (document.body.style.overflow === 'hidden') return null;
  const view = window.innerHeight;
  const total = document.documentElement.scrollHeight;
  if (total - view < 2) return null;
  return layout(INSET, view - INSET * 2, EDGE_GAP, window.scrollY, total, view);
}

function maxScroll(target: HTMLElement | null) {
  return target
    ? target.scrollHeight - target.clientHeight
    : document.documentElement.scrollHeight - window.innerHeight;
}

/**
 * An always-visible, draggable scroll bar on the right edge. Phone browsers only flash their own
 * scroll bar while a finger is moving, so this one is drawn by the app.
 * Without a `target` it follows the page; with one it follows that scrolling element.
 */
export default function ScrollRail({ target = null }: { target?: HTMLElement | null }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startScroll: number; ratio: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setMetrics(readMetrics(target));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const scroller: HTMLElement | Window = target ?? window;
    const content = target ?? document.body;
    const resize = new ResizeObserver(schedule);
    const observeChildren = () => {
      resize.observe(content);
      Array.from(content.children).forEach(child => resize.observe(child));
    };
    const mutations = new MutationObserver(() => {
      observeChildren();
      schedule();
    });
    const bodyStyle = new MutationObserver(schedule);

    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    observeChildren();
    mutations.observe(content, { childList: true, subtree: true });
    bodyStyle.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    schedule();
    // Sheets and pop-ups slide in, which moves the element without any event.
    const settle = window.setTimeout(schedule, 500);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resize.disconnect();
      mutations.disconnect();
      bodyStyle.disconnect();
    };
  }, [target]);

  if (!metrics) return null;

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      startY: event.clientY,
      startScroll: target ? target.scrollTop : window.scrollY,
      ratio: maxScroll(target) / Math.max(1, metrics.height - metrics.thumbHeight),
    };
    setDragging(true);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const top = drag.current.startScroll + (event.clientY - drag.current.startY) * drag.current.ratio;
    if (target) target.scrollTop = top;
    else window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return createPortal(
    <div className="cx-rail" style={{ top: metrics.top, height: metrics.height, right: metrics.right }} aria-hidden="true">
      <div
        className={`cx-rail-thumb ${dragging ? 'is-dragging' : ''}`}
        style={{ height: metrics.thumbHeight, transform: `translateY(${metrics.thumbTop}px)` }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </div>,
    document.body,
  );
}
