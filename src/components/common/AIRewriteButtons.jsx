import React, { useState } from 'react';
import { aiService } from '../../services/aiService';
import AIResultPreview from './AIResultPreview';

const TONES = ['Cheerful', 'Casual', 'Professional', 'Shorter'];

export default function AIRewriteButtons({ text, onApply, context = {}, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRewrite = async (tone) => {
    const current = (text || '').trim();
    if (!current) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const rewritten = await aiService.rewriteNotes(current, { ...context, tone });
      setResult(rewritten);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (result) onApply(result);
    setResult(null);
  };

  const reject = () => {
    setResult(null);
    setError(null);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2 text-xs">
        {TONES.map((tone) => (
          <button
            key={tone}
            type="button"
            onClick={() => handleRewrite(tone)}
            disabled={loading || disabled || !(text || '').trim()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-purple-500/30 text-purple-300 hover:bg-purple-600/20 hover:text-purple-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>✨</span> {tone}
          </button>
        ))}
      </div>
      {error && (
        <div className="mt-2 text-xs text-signal-coral">{error}</div>
      )}
      <AIResultPreview
        result={result}
        loading={loading}
        label="AI Rewrite"
        onAccept={accept}
        onReject={reject}
        onRetry={() => handleRewrite('Professional')}
      />
    </>
  );
}
