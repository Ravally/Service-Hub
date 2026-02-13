import React from 'react';

export default function PlaceholderPage({ icon, title, description, features }) {
  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-start justify-center pt-16">
      <div className="bg-charcoal rounded-xl border border-slate-700/30 p-10 max-w-lg w-full text-center">
        <div className="flex justify-center mb-5">{icon}</div>
        <h2 className="text-2xl font-semibold font-display text-slate-100 mb-2">{title}</h2>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-scaffld-teal/15 text-scaffld-teal mb-4">Coming Soon</span>
        <p className="text-slate-400 text-sm mb-6">{description}</p>
        <div className="text-left bg-midnight/60 rounded-lg p-5 border border-slate-700/20">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Planned Features</p>
          <ul className="space-y-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-scaffld-teal flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
