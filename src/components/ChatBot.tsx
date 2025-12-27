import { useState, useEffect, useRef } from 'react';
import { chatApi } from '../services/api';
import '../styles/ChatBot.css';

// Types
type PersonaType = 'friend' | 'lover' | 'business_partner' | 'stranger' | 'celebrity' | 'therapist' | 'drunk_uncle';
type Gender = 'male' | 'female' | 'other';
type RelationshipStatus = 'single' | 'committed' | 'married' | 'couple';

interface LoverConfig {
  gender: Gender;
  relationshipStatus: RelationshipStatus;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface Order {
  id: string;
  items: Array<{ id: number; name: string; quantity: number; price: number; emoji?: string }>;
  total: number;
  status: string;
  tableNumber?: number;
}

interface ChatBotProps {
  order?: Order;
  initialPersona: string;
  onClose: () => void;
}

const PERSONAS: { id: PersonaType; label: string; emoji: string }[] = [
  { id: 'friend', label: 'Friend', emoji: '🤗' },
  { id: 'lover', label: 'Lover', emoji: '💕' },
  { id: 'business_partner', label: 'Business', emoji: '💼' },
  { id: 'stranger', label: 'Comedian', emoji: '😂' },
  { id: 'celebrity', label: 'Celebrity', emoji: '⭐' },
  { id: 'therapist', label: 'Therapist', emoji: '🧠' },
  { id: 'drunk_uncle', label: 'Drunk Uncle', emoji: '🍺' },
];

const GENDERS: { id: Gender; label: string; emoji: string }[] = [
  { id: 'male', label: 'Male', emoji: '👨' },
  { id: 'female', label: 'Female', emoji: '👩' },
  { id: 'other', label: 'Other', emoji: '🌈' },
];

const RELATIONSHIP_STATUSES: { id: RelationshipStatus; label: string; emoji: string }[] = [
  { id: 'single', label: 'Single', emoji: '💫' },
  { id: 'committed', label: 'Committed', emoji: '💑' },
  { id: 'married', label: 'Married', emoji: '💍' },
  { id: 'couple', label: 'Couple', emoji: '❤️‍🔥' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function ChatBot({ order, initialPersona, onClose }: ChatBotProps) {
  const [step, setStep] = useState<'lover_gender' | 'lover_status' | 'chatting'>(
    initialPersona === 'lover' ? 'lover_gender' : 'chatting'
  );
  const [selectedPersona] = useState<PersonaType>(initialPersona as PersonaType);
  const [loverConfig, setLoverConfig] = useState<LoverConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chatting
  useEffect(() => {
    if (step === 'chatting') {
      inputRef.current?.focus();
    }
  }, [step]);

  // Get initial greeting when entering chat
  useEffect(() => {
    if (step === 'chatting' && !hasGreeted) {
      getInitialGreeting();
      setHasGreeted(true);
    }
  }, [step, hasGreeted]);

  const selectGender = (gender: Gender) => {
    setLoverConfig({ gender, relationshipStatus: 'single' });
    setStep('lover_status');
  };

  const selectRelationshipStatus = (status: RelationshipStatus) => {
    setLoverConfig(prev => ({
      gender: prev?.gender || 'other',
      relationshipStatus: status,
    }));
    setStep('chatting');
  };

  const getInitialGreeting = async () => {
    setIsTyping(true);

    try {
      const response = await chatApi.sendMessage({
        message: 'START_CONVERSATION',
        persona: selectedPersona,
        loverConfig: loverConfig || undefined,
        orderContext: order,
        conversationHistory: [],
      });

      const botMessage: Message = {
        id: generateId(),
        text: response.response || "Hey! What's up? 🎉",
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages([botMessage]);
    } catch (error) {
      console.error('Error getting greeting:', error);
      setMessages([{
        id: generateId(),
        text: "Hey there! Ready to chat? 🎉",
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      }));

      const response = await chatApi.sendMessage({
        message: inputValue,
        persona: selectedPersona,
        loverConfig: loverConfig || undefined,
        orderContext: order,
        conversationHistory,
      });

      const botMessage: Message = {
        id: generateId(),
        text: response.response || "Hmm, let me think...",
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPersonaInfo = () => {
    return PERSONAS.find(p => p.id === selectedPersona) || PERSONAS[0];
  };

  return (
    <div className="chatbot-fullscreen">
      {/* Header */}
      <div className="chat-header">
        <button className="back-button" onClick={onClose}>
          ← Back
        </button>
        <div className="header-center">
          <span className="bot-emoji">{getPersonaInfo().emoji}</span>
          <div className="header-info">
            <h3>{getPersonaInfo().label}</h3>
            <span className="status">{isTyping ? 'Typing...' : 'Online'}</span>
          </div>
        </div>
        <div className="header-spacer"></div>
      </div>

      {/* Body */}
      <div className="chat-body">
        {/* Lover - Gender Selection */}
        {step === 'lover_gender' && (
          <div className="fullscreen-selection">
            <div className="selection-header">
              <h2>Ooh, romantic! 💕</h2>
              <p>What's your vibe?</p>
            </div>

            <div className="selection-grid">
              {GENDERS.map(gender => (
                <button
                  key={gender.id}
                  className="selection-card"
                  onClick={() => selectGender(gender.id)}
                >
                  <span className="card-emoji">{gender.emoji}</span>
                  <span className="card-label">{gender.label}</span>
                </button>
              ))}
            </div>

            <button className="back-link" onClick={onClose}>
              ← Back to Order
            </button>
          </div>
        )}

        {/* Lover - Status Selection */}
        {step === 'lover_status' && (
          <div className="fullscreen-selection">
            <div className="selection-header">
              <h2>Tell me more... 👀</h2>
              <p>What's your relationship status?</p>
            </div>

            <div className="selection-grid">
              {RELATIONSHIP_STATUSES.map(status => (
                <button
                  key={status.id}
                  className="selection-card"
                  onClick={() => selectRelationshipStatus(status.id)}
                >
                  <span className="card-emoji">{status.emoji}</span>
                  <span className="card-label">{status.label}</span>
                </button>
              ))}
            </div>

            <button className="back-link" onClick={() => setStep('lover_gender')}>
              ← Back
            </button>
          </div>
        )}

        {/* Chat Messages */}
        {step === 'chatting' && (
          <div className="messages-container">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message ${message.sender}`}
              >
                <div className="message-bubble">
                  {message.text}
                </div>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="message bot">
                <div className="message-bubble typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {step === 'chatting' && (
        <div className="chat-input-area">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="chat-input"
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={!inputValue.trim() || isTyping}
          >
            <span>🚀</span>
          </button>
        </div>
      )}
    </div>
  );
}