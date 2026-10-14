import { useEffect, useRef } from 'react';

/**
 * Makes the phone/browser back button close pop-ups, sheets and full-screen views
 * (top-most first) instead of leaving the page, like a native app.
 *
 * Every open layer owns one history entry on the current URL, tagged with its depth.
 * Layers can open and close in the same render (e.g. invite -> chat), so history is
 * synced after the render settles instead of on every change.
 */

interface Layer {
  close: () => void;
}

const layers: Layer[] = [];
let ignoreNextPop = false;
let syncScheduled = false;

const historyDepth = (): number => window.history.state?.ffDepth ?? 0;

function syncHistory() {
  syncScheduled = false;
  const current = historyDepth();
  const wanted = layers.length;
  if (wanted > current) {
    for (let depth = current + 1; depth <= wanted; depth += 1) {
      window.history.pushState({ ...window.history.state, ffDepth: depth }, '');
    }
  } else if (wanted < current) {
    ignoreNextPop = true;
    window.history.go(wanted - current);
  }
}

function scheduleSync() {
  if (syncScheduled) return;
  syncScheduled = true;
  window.setTimeout(syncHistory, 0);
}

window.addEventListener('popstate', () => {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }
  const depth = historyDepth();
  while (layers.length > depth) layers.pop()!.close();
  if (depth > layers.length) scheduleSync();
});

// A reload keeps the extra entries but not the open layers; drop them so back isn't a dead press.
if (historyDepth() > 0) {
  ignoreNextPop = true;
  window.history.go(-historyDepth());
}

/** While `active`, the back button calls `onBack` instead of leaving the page. */
export function useBackButton(active: boolean, onBack: () => void) {
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (!active) return;
    const layer: Layer = { close: () => handler.current() };
    layers.push(layer);
    scheduleSync();
    return () => {
      const index = layers.indexOf(layer);
      if (index === -1) return;
      layers.splice(index, 1);
      scheduleSync();
    };
  }, [active]);
}
