import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowLeft, ChevronRight, RotateCw, SendHorizontal } from 'lucide-react';
import { useBackButton } from '../../shared/backButton';
import { sendChatMessage, type LoverConfig } from '../api';
import { PERSONAS } from '../personas';
import type { ChatTurn, PersonaId } from '../types';
import { useBodyScrollLock, useEscapeKey } from '../hooks';
import ScrollRail from './ScrollRail';

interface ChoiceOption<T extends string> {
  id: T;
  label: string;
  emoji: string;
}

const LOVER_ROLES: (ChoiceOption<LoverConfig['gender']> & { name: string })[] = [
  { id: 'male', label: 'Boyfriend', name: 'Arjun', emoji: '👨' },
  { id: 'female', label: 'Girlfriend', name: 'Anaya', emoji: '👩' },
  { id: 'other', label: 'Partner', name: 'Rio', emoji: '🌈' },
];

const RELATIONSHIP_STATUSES: ChoiceOption<LoverConfig['relationshipStatus']>[] = [
  { id: 'single', label: 'New crush', emoji: '💫' },
  { id: 'committed', label: 'Committed', emoji: '💑' },
  { id: 'married', label: 'Married', emoji: '💍' },
  { id: 'couple', label: 'Playful couple', emoji: '❤️‍🔥' },
];

const SUGGESTIONS = ['Who are you? 👀', 'What goes well with my food?', 'What should I try next time?'];

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  time: Date;
}

interface PendingRequest {
  text: string;
  history: ChatTurn[];
}

interface ChatScreenProps {
  persona: PersonaId;
  orderNumber: string;
  code: string;
  onClose: () => void;
}

let nextMessageId = 1;
const message = (text: string, sender: Message['sender']): Message => ({ id: nextMessageId++, text, sender, time: new Date() });

export default function ChatScreen({ persona, orderNumber, code, onClose }: ChatScreenProps) {
  const info = PERSONAS.find(p => p.id === persona) ?? PERSONAS[0];
  const [step, setStep] = useState<'role' | 'status' | 'chatting'>(persona === 'lover' ? 'role' : 'chatting');
  const [loverRole, setLoverRole] = useState<LoverConfig['gender']>('other');
  const [loverConfig, setLoverConfig] = useState<LoverConfig>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [failed, setFailed] = useState<(PendingRequest & { error: string }) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const greeted = useRef(false);
  const loverRoleInfo = loverConfig ? LOVER_ROLES.find(role => role.id === loverConfig.gender) : undefined;
  const displayName = loverRoleInfo?.name ?? info.name;
  const avatar = loverRoleInfo?.emoji ?? info.emoji;

  useBodyScrollLock(true);
  useBackButton(true, onClose);
  useBackButton(step === 'status', () => setStep('role'));
  useEscapeKey(true, onClose);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, failed]);

  const ask = async (request: PendingRequest) => {
    setTyping(true);
    setFailed(null);
    try {
      const reply = await sendChatMessage({
        code, orderNumber, persona, loverConfig, message: request.text, conversationHistory: request.history,
      });
      setMessages(prev => [...prev, message(reply, 'bot')]);
    } catch (err) {
      setFailed({ ...request, error: (err as Error).message });
    } finally {
      setTyping(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (step !== 'chatting' || greeted.current) return;
    greeted.current = true;
    void ask({ text: '', history: [] });
  }, [step]);

  const sendText = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    const history: ChatTurn[] = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    setMessages(prev => [...prev, message(text, 'user')]);
    setInput('');
    void ask({ text, history });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    sendText(input);
  };

  const showSuggestions = step === 'chatting' && !typing && !failed && messages.length === 1;

  return (
    <div className="cx-chat" role="dialog" aria-modal="true" aria-label={`Chat with ${displayName}`}>
      <header className="cx-chat-head">
        <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Back to your order">
          <ArrowLeft size={22} />
        </button>
        <span className="cx-chat-avatar" aria-hidden="true">{avatar}</span>
        <div className="cx-chat-who">
          <strong>{displayName}</strong>
          <span className={typing ? 'is-typing' : ''}>
            {displayName !== info.label && `${loverRoleInfo?.label ?? info.label} · `}
            {typing ? 'Typing...' : 'Online'}
          </span>
        </div>
      </header>

      <div className="cx-chat-body" ref={setBodyEl}>
        <ScrollRail target={bodyEl} />
        {step === 'role' && (
          <ChoiceStep
            title="Ooh, romantic! 💕"
            text="Who would you like me to be?"
            options={LOVER_ROLES}
            onPick={id => { setLoverRole(id); setStep('status'); }}
          />
        )}
        {step === 'status' && (
          <ChoiceStep
            title="Tell me more... 👀"
            text="What are we to each other?"
            options={RELATIONSHIP_STATUSES}
            onPick={id => { setLoverConfig({ gender: loverRole, relationshipStatus: id }); setStep('chatting'); }}
            onBack={() => setStep('role')}
          />
        )}
        {step === 'chatting' && (
          <div className="cx-chat-messages">
            <p className="cx-chat-context">Order #{orderNumber} · {info.description}</p>
            {messages.map(m => (
              <div key={m.id} className={`cx-bubble-row is-${m.sender}`}>
                {m.sender === 'bot' && <span className="cx-bubble-avatar" aria-hidden="true">{avatar}</span>}
                <div className="cx-bubble-stack">
                  <div className="cx-bubble">{m.text}</div>
                  <time>{m.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                </div>
              </div>
            ))}
            {typing && (
              <div className="cx-bubble-row is-bot">
                <span className="cx-bubble-avatar" aria-hidden="true">{avatar}</span>
                <div className="cx-bubble cx-typing" aria-label="Typing"><span /><span /><span /></div>
              </div>
            )}
            {failed && (
              <div className="cx-chat-error" role="alert">
                <AlertCircle size={18} />
                <span>{failed.error}</span>
                <button type="button" className="cx-btn cx-btn--soft cx-btn--sm" onClick={() => void ask(failed)}>
                  <RotateCw size={15} /> Try again
                </button>
              </div>
            )}
            {showSuggestions && (
              <div className="cx-chat-suggestions">
                {SUGGESTIONS.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => sendText(suggestion)}>{suggestion}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {step === 'chatting' && (
        <form className="cx-chat-input" onSubmit={submit}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${displayName}...`}
            aria-label="Message"
            maxLength={500}
          />
          <button type="submit" className="cx-send-btn" disabled={!input.trim() || typing} aria-label="Send">
            <SendHorizontal size={20} />
          </button>
        </form>
      )}
    </div>
  );
}

function ChoiceStep<T extends string>({
  title, text, options, onPick, onBack,
}: {
  title: string;
  text: string;
  options: ChoiceOption<T>[];
  onPick: (id: T) => void;
  onBack?: () => void;
}) {
  return (
    <div className="cx-choice">
      <h2>{title}</h2>
      <p>{text}</p>
      <div className={`cx-choice-grid ${options.length % 2 === 0 ? 'is-two' : 'is-three'}`}>
        {options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            className="cx-choice-card"
            style={{ animationDelay: `${index * 70}ms` }}
            onClick={() => onPick(option.id)}
          >
            <span className="cx-choice-emoji" aria-hidden="true">{option.emoji}</span>
            <strong>{option.label}</strong>
            <span className="cx-choice-go" aria-hidden="true">Pick <ChevronRight size={13} /></span>
          </button>
        ))}
      </div>
      {onBack && (
        <button type="button" className="cx-btn cx-btn--ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
      )}
    </div>
  );
}
