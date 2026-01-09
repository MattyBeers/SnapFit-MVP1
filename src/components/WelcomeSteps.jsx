import React from 'react';

export default function WelcomeSteps({ variant = 'card', onContinue, onShowAnalytics }) {
  const steps = [
    { icon: '📸', title: 'Snap your clothes', subtitle: 'Capture clean photos of each garment for best results.' },
    { icon: '🎨', title: 'Remove backgrounds', subtitle: 'Clean images help the VFR place garments accurately.' },
    { icon: '👤', title: 'Try on in Virtual Fitting Room', subtitle: 'Mix & match items and preview outfits instantly.' },
    { icon: '💾', title: 'Save & organize outfits', subtitle: 'Keep looks ready for any occasion.' },
    { icon: '✨', title: 'Get AI styling suggestions', subtitle: 'Personalized tips to improve outfit choices.' }
  ];

  if (variant === 'compact') {
    return (
      <div className="welcome-steps-compact">
        {steps.map((s, i) => (
          <div key={i} className="step-compact">
            <span className="step-icon">{s.icon}</span>
            <span>{s.title}</span>
          </div>
        ))}
      </div>
    );
  }

  // Default: card / inline hero
  return (
    <div className="sf-card welcome-steps-card" style={{ padding: 18 }}>
      <div className="sf-kicker">Get started</div>
      <h3 className="sf-title-sm" style={{ marginTop: 6 }}>How SnapFit works</h3>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{s.title}</div>
              <div className="sf-subtitle">{s.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        {onContinue && (
          <button className="sf-btn sf-btn-primary" onClick={onContinue}>Open My Closet</button>
        )}
        {onShowAnalytics && (
          <button className="sf-btn sf-btn-outline" onClick={onShowAnalytics}>My Style Analytics</button>
        )}
      </div>
    </div>
  );
}
