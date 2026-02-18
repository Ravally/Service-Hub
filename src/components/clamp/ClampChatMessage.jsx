import React from 'react';
import ClampIcon from './ClampIcon';
import ClampActionCard from './ClampActionCard';

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm text-clamp font-semibold">Clamp is working</span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-clamp animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-1 w-1 rounded-full bg-clamp animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-1 w-1 rounded-full bg-clamp animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </span>
  );
}

export default function ClampChatMessage({ message, onNavigate }) {
  const isUser = message.role === 'user';
  const isThinking = message.isThinking;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-slate-700/50 rounded-2xl rounded-br-sm px-4 py-2.5">
          <p className="text-sm text-slate-100 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="h-7 w-7 rounded-full bg-clamp-soft border border-clamp-border flex-shrink-0 flex items-center justify-center mt-0.5">
        <ClampIcon size={14} className="text-clamp" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="max-w-[90%] bg-midnight/60 border border-slate-700/30 rounded-2xl rounded-bl-sm px-4 py-2.5">
          {isThinking ? (
            <ThinkingDots />
          ) : (
            <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">{message.content}</p>
          )}
        </div>
        {(message.actionCards || []).map((card, i) => (
          <ClampActionCard key={`action-${i}`} card={card} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
