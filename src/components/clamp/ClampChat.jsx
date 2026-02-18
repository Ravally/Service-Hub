import React, { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { clampChatService } from '../../services/clampChatService';
import ClampIcon from './ClampIcon';
import ClampChatMessage from './ClampChatMessage';
import ClampChatInput from './ClampChatInput';
import ClampQuickChips from './ClampQuickChips';

const WELCOME_CHIPS = [
  "Show today's schedule",
  'Find a client',
  'Create a new job',
  "What's overdue?",
];

function getInitialOpen() {
  try { return localStorage.getItem('clampChatOpen') === 'true'; } catch { return false; }
}

export default function ClampChat() {
  const { navigateToView } = useAppState();
  const [isOpen, setIsOpen] = useState(getInitialOpen);
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [hasPulsed, setHasPulsed] = useState(false);
  const messagesEndRef = useRef(null);

  // Persist open/closed state
  useEffect(() => {
    try { localStorage.setItem('clampChatOpen', isOpen); } catch {}
  }, [isOpen]);

  // Pulse animation on first render only
  useEffect(() => {
    const timer = setTimeout(() => setHasPulsed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (text) => {
    const userMsg = { id: crypto.randomUUID(), role: 'user', content: text };
    const thinkingMsg = { id: 'thinking', role: 'clamp', content: '', isThinking: true };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setIsThinking(true);

    // Build conversation for the backend (only role + content)
    const apiMessages = [...messages, userMsg]
      .filter((m) => !m.isThinking)
      .map((m) => ({ role: m.role === 'clamp' ? 'assistant' : m.role, content: m.content }));

    try {
      const response = await clampChatService.send(apiMessages);
      const clampMsg = {
        id: crypto.randomUUID(),
        role: 'clamp',
        content: response.reply,
        actionCards: response.actionCards || [],
        quickReplies: response.quickReplies || [],
      };
      setMessages((prev) => prev.filter((m) => m.id !== 'thinking').concat(clampMsg));
    } catch (err) {
      const errorMsg = {
        id: crypto.randomUUID(),
        role: 'clamp',
        content: err.message || 'Clamp ran into a problem. Try again.',
      };
      setMessages((prev) => prev.filter((m) => m.id !== 'thinking').concat(errorMsg));
    } finally {
      setIsThinking(false);
    }
  };

  const handleNavigate = (card) => {
    navigateToView(card.view || 'dashboard');
    setIsOpen(false);
  };

  const lastClampMsg = [...messages].reverse().find((m) => m.role === 'clamp' && !m.isThinking);
  const quickReplies = lastClampMsg?.quickReplies || [];
  const showWelcome = messages.length === 0;

  // ── COLLAPSED STATE ──
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-gradient-to-br from-clamp to-clamp-deep shadow-lg flex items-center justify-center hover:scale-105 transition-transform ${!hasPulsed ? 'animate-pulse' : ''}`}
        style={{ boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}
        title="Open Clamp"
      >
        <ClampIcon size={24} className="text-white" />
      </button>
    );
  }

  // ── EXPANDED STATE ──
  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-[400px] h-[560px] max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:bottom-0 max-sm:right-0 max-sm:rounded-none flex flex-col bg-charcoal border border-clamp-border/40 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/30 flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-clamp-soft border border-clamp-border flex items-center justify-center">
          <ClampIcon size={16} className="text-clamp" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-100">Clamp</div>
          <div className="text-xs text-slate-400">AI Foreman</div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="h-11 w-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 transition-colors"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {showWelcome ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-clamp-soft border border-clamp-border flex items-center justify-center">
              <ClampIcon size={24} className="text-clamp" />
            </div>
            <div className="text-lg font-bold text-slate-100">What can I help with?</div>
            <ClampQuickChips chips={WELCOME_CHIPS} onSelect={handleSend} disabled={isThinking} />
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ClampChatMessage key={msg.id} message={msg} onNavigate={handleNavigate} />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {!showWelcome && quickReplies.length > 0 && (
        <ClampQuickChips chips={quickReplies} onSelect={handleSend} disabled={isThinking} />
      )}

      {/* Input Bar */}
      {!showWelcome && <ClampChatInput onSend={handleSend} disabled={isThinking} />}
    </div>
  );
}
