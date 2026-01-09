/**
 * Style Analytics Dashboard
 * Shows user's fashion insights and outfit performance
 */

import { useState, useEffect } from 'react';
import { getUserStyleInsights } from '../lib/fitScoring';

export default function StyleAnalytics({ onClose }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = () => {
    setLoading(true);
    const data = getUserStyleInsights();
    setInsights(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="analytics-overlay" onClick={onClose}>
        <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
          <div className="analytics-loading">Loading insights...</div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="analytics-overlay" onClick={onClose}>
        <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
          <div className="analytics-header">
            <h3>📊 Your Style Analytics</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="analytics-empty">
            <span className="empty-icon">📈</span>
            <h4>Start Building Your Style Profile</h4>
            <p>Try on outfits to see your personalized fashion insights!</p>
          </div>
        </div>
      </div>
    );
  }

  const getFitScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getFitScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Work';
  };

  return (
    <div className="analytics-overlay" onClick={onClose}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <div>
            <h3>📊 Your Style Analytics</h3>
            <p className="analytics-subtitle">Data-driven fashion insights</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="analytics-content">
          {/* Key Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">👕</div>
              <div className="metric-value">{insights.totalOutfits}</div>
              <div className="metric-label">Total Outfits</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">👀</div>
              <div className="metric-value">{insights.totalTryOns}</div>
              <div className="metric-label">Virtual Try-Ons</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">✨</div>
              <div className="metric-value">{insights.totalWorn}</div>
              <div className="metric-label">Times Worn</div>
            </div>

            <div className="metric-card highlight">
              <div className="metric-icon">🎯</div>
              <div 
                className="metric-value" 
                style={{ color: getFitScoreColor(insights.avgFitScore) }}
              >
                {insights.avgFitScore}%
              </div>
              <div className="metric-label">
                Avg Fit Score
                <span className="score-badge" style={{ 
                  backgroundColor: getFitScoreColor(insights.avgFitScore) 
                }}>
                  {getFitScoreLabel(insights.avgFitScore)}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="analytics-section">
            <h4>📅 This Week</h4>
            <div className="weekly-stats">
              <div className="weekly-stat">
                <span className="stat-label">Try-Ons</span>
                <span className="stat-value">{insights.weeklyActivity.tryOns}</span>
              </div>
              <div className="weekly-stat">
                <span className="stat-label">Worn</span>
                <span className="stat-value">{insights.weeklyActivity.worn}</span>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="analytics-section">
            <h4>🔥 What's Working</h4>
            <div className="insight-cards">
              <div className="insight-card">
                <div className="insight-title">Most Tried</div>
                <div className="insight-value">
                  {insights.mostPopular.tried?.tryOns || 0} try-ons
                </div>
                <div className="insight-desc">Your go-to outfit for virtual styling</div>
              </div>

              <div className="insight-card">
                <div className="insight-title">Most Worn</div>
                <div className="insight-value">
                  {insights.mostPopular.worn?.wornDates?.length || 0} times
                </div>
                <div className="insight-desc">Your favorite in real life</div>
              </div>
            </div>
          </div>

          {/* Style Recommendations */}
          <div className="analytics-section">
            <h4>💡 Insights & Tips</h4>
            <div className="tips-list">
              {insights.avgFitScore >= 80 && (
                <div className="tip success">
                  <span className="tip-icon">🌟</span>
                  <div>
                    <strong>You're a style pro!</strong>
                    <p>Your outfits consistently score high. Keep up the great work!</p>
                  </div>
                </div>
              )}

              {insights.avgFitScore < 60 && (
                <div className="tip warning">
                  <span className="tip-icon">💭</span>
                  <div>
                    <strong>Room for improvement</strong>
                    <p>Try experimenting with different styles and check your fit scores.</p>
                  </div>
                </div>
              )}

              {insights.totalTryOns > 10 && (
                <div className="tip info">
                  <span className="tip-icon">🎨</span>
                  <div>
                    <strong>Fashion explorer</strong>
                    <p>You love trying new looks! Your style is evolving beautifully.</p>
                  </div>
                </div>
              )}

              {insights.totalWorn > 5 && (
                <div className="tip info">
                  <span className="tip-icon">👔</span>
                  <div>
                    <strong>Wardrobe maximizer</strong>
                    <p>You're making the most of your closet. That's sustainable fashion!</p>
                  </div>
                </div>
              )}

              {insights.totalOutfits < 5 && (
                <div className="tip info">
                  <span className="tip-icon">➕</span>
                  <div>
                    <strong>Build your collection</strong>
                    <p>Create more outfits to unlock deeper style insights!</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="analytics-cta">
            <p>💪 Keep styling to improve your score!</p>
            <p className="cta-subtitle">
              The more you use SnapFit, the smarter your recommendations become.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .analytics-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }

        .analytics-modal {
          background: white;
          border-radius: 20px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
        }

        .analytics-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 20px 20px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .analytics-header h3 {
          margin: 0 0 4px 0;
          font-size: 28px;
          font-weight: 700;
        }

        .analytics-subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .analytics-content {
          padding: 30px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .metric-card {
          background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%);
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .metric-card.highlight {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: #fbbf24;
        }

        .metric-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .metric-value {
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 8px;
          color: #111827;
        }

        .metric-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .score-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          color: white;
          font-weight: 600;
        }

        .analytics-section {
          margin-bottom: 32px;
        }

        .analytics-section h4 {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 16px 0;
          color: #111827;
        }

        .weekly-stats {
          display: flex;
          gap: 16px;
        }

        .weekly-stat {
          flex: 1;
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #667eea;
        }

        .insight-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .insight-card {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 20px;
        }

        .insight-title {
          font-size: 13px;
          text-transform: uppercase;
          font-weight: 600;
          color: #059669;
          margin-bottom: 8px;
        }

        .insight-value {
          font-size: 24px;
          font-weight: 700;
          color: #065f46;
          margin-bottom: 4px;
        }

        .insight-desc {
          font-size: 13px;
          color: #059669;
        }

        .tips-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tip {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 12px;
          align-items: flex-start;
        }

        .tip.success {
          background: #ecfdf5;
          border: 2px solid #10b981;
        }

        .tip.warning {
          background: #fef3c7;
          border: 2px solid #f59e0b;
        }

        .tip.info {
          background: #eff6ff;
          border: 2px solid #3b82f6;
        }

        .tip-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .tip strong {
          display: block;
          margin-bottom: 4px;
          color: #111827;
        }

        .tip p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .analytics-cta {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          margin-top: 32px;
        }

        .analytics-cta p {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .cta-subtitle {
          font-size: 14px !important;
          opacity: 0.9;
          font-weight: 400 !important;
          margin-top: 8px !important;
        }

        .analytics-empty {
          padding: 60px 40px;
          text-align: center;
        }

        .empty-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 16px;
        }

        .analytics-empty h4 {
          font-size: 22px;
          margin: 0 0 8px 0;
          color: #111827;
        }

        .analytics-empty p {
          margin: 0;
          color: #6b7280;
        }

        .analytics-loading {
          padding: 60px 40px;
          text-align: center;
          font-size: 18px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .analytics-header {
            padding: 20px;
          }

          .analytics-content {
            padding: 20px;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .insight-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
