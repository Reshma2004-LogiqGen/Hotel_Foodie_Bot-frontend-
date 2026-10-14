import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, MessageCircleHeart, X } from 'lucide-react';
import { useBackButton } from '../../shared/backButton';
import { PERSONAS } from '../personas';
import ScrollRail from './ScrollRail';
import type { PersonaId } from '../types';
import { useBodyScrollLock, useEscapeKey } from '../hooks';

const PROMPTS = [
  { emoji: '💬', title: 'Your food is', accent: 'on its way!', text: '', no: 'Not now' },
  { emoji: '😢', title: 'Aww,', accent: 'are you sure?', text: "I promise I won't bite... I'm just a friendly chatbot!", no: 'Still no thanks' },
  { emoji: '😭', title: 'Pretty', accent: 'please? 🥺', text: "Just one little chat? I've been practising my jokes all day!", no: 'I really mean it!' },
];

const TICKER_INTERVAL_MS = 1800;

function BuddyTicker() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(t => t + 1), TICKER_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const count = PERSONAS.length;
  const current = PERSONAS[tick % count];
  const previous = PERSONAS[(tick - 1 + count) % count];

  return (
    <div className="cx-buddy-ticker">
      <span className="cx-sr-only">Chat with {PERSONAS.map(p => p.label).join(', ')}</span>
      <span className="cx-buddy-ticker-icon" aria-hidden="true"><MessageCircleHeart size={16} /></span>
      <span className="cx-buddy-ticker-label" aria-hidden="true">Chat with</span>
      <span className="cx-buddy-ticker-window" aria-hidden="true">
        {tick > 0 && (
          <span key={`out-${tick}`} className="cx-buddy-ticker-item is-out">
            <span>{previous.emoji}</span> {previous.label}
          </span>
        )}
        <span key={`in-${tick}`} className={`cx-buddy-ticker-item ${tick > 0 ? 'is-in' : ''}`}>
          <span>{current.emoji}</span> {current.label}
        </span>
      </span>
    </div>
  );
}

interface ChatInviteProps {
  step: 'prompt' | 'personas';
  declines: number;
  onYes: () => void;
  onNo: () => void;
  onBack: () => void;
  onPick: (persona: PersonaId) => void;
  onClose: () => void;
}

export default function ChatInvite({ step, declines, onYes, onNo, onBack, onPick, onClose }: ChatInviteProps) {
  useBodyScrollLock(true);
  useBackButton(true, onClose);
  useEscapeKey(true, onClose);
  const prompt = PROMPTS[Math.min(declines, PROMPTS.length - 1)];
  const [modalEl, setModalEl] = useState<HTMLElement | null>(null);

  return (
    <div className="cx-overlay cx-overlay--center" onClick={onClose}>
      <ScrollRail target={modalEl} />
      <section
        ref={setModalEl}
        className={`cx-modal ${step === 'prompt' ? 'cx-modal--invite' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cx-invite-title"
        onClick={e => e.stopPropagation()}
      >
        {step === 'prompt' ? (
          <div className="cx-invite">
            <div className="cx-invite-hero" aria-hidden="true">
              {PERSONAS.map((persona, index) => (
                <span key={persona.id} className={`cx-invite-orbit is-${index + 1}`}>{persona.emoji}</span>
              ))}
              <span key={declines} className={`cx-invite-emoji ${declines ? 'is-sad' : ''}`}>{prompt.emoji}</span>
            </div>
            <button type="button" className="cx-invite-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>

            <div className="cx-invite-body">
              <h2 id="cx-invite-title" className="cx-invite-title">
                {prompt.title} <span>{prompt.accent}</span>
              </h2>
              {prompt.text && <p>{prompt.text}</p>}
              <BuddyTicker />
              <button type="button" className="cx-btn cx-btn--primary cx-btn--block cx-btn--lg" onClick={onYes}>
                <MessageCircleHeart size={20} /> Yes, let's chat!
              </button>
              <button type="button" className="cx-btn cx-btn--ghost cx-btn--block" onClick={onNo}>
                {prompt.no}
              </button>
            </div>
          </div>
        ) : (
          <div className="cx-personas">
            <div className="cx-modal-head">
              <button type="button" className="cx-icon-btn" onClick={onBack} aria-label="Back">
                <ArrowLeft size={20} />
              </button>
              <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <h2 id="cx-invite-title">Choose your chat buddy</h2>
            <p>Who would you like to talk to while your food cooks?</p>
            <div className="cx-persona-grid">
              {PERSONAS.map(persona => (
                <button key={persona.id} type="button" className="cx-persona" onClick={() => onPick(persona.id)}>
                  <span className="cx-persona-emoji" aria-hidden="true">{persona.emoji}</span>
                  <strong>{persona.label}</strong>
                  <span className="cx-persona-desc">{persona.description}</span>
                  <span className="cx-persona-go" aria-hidden="true">Chat <ChevronRight size={13} /></span>
                </button>
              ))}
            </div>
            <button type="button" className="cx-btn cx-btn--ghost cx-btn--block" onClick={onClose}>
              Maybe later
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
