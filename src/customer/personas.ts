import type { PersonaId } from './types';

export const PERSONAS: { id: PersonaId; label: string; name: string; emoji: string; description: string }[] = [
  { id: 'friend', label: 'Friend', name: 'Sam', emoji: '🤗', description: 'Casual & fun' },
  { id: 'lover', label: 'Lover', name: 'Lover', emoji: '💕', description: 'Flirty & sweet' },
  { id: 'business_partner', label: 'Business', name: 'Vikram Mehta', emoji: '💼', description: 'Professional' },
  { id: 'stranger', label: 'Comedian', name: 'Bunty', emoji: '😂', description: 'Hilarious' },
  { id: 'celebrity', label: 'Celebrity', name: 'Zara Kapoor', emoji: '⭐', description: 'Dramatic' },
  { id: 'therapist', label: 'Therapist', name: 'Dr. Meera', emoji: '🧠', description: 'Supportive' },
  { id: 'drunk_uncle', label: 'Uncle', name: 'Pappu Uncle', emoji: '🍺', description: 'Chaotic' },
];

export function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1.2;
  const voice = window.speechSynthesis
    .getVoices()
    .find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
