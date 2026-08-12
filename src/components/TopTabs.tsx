import React from 'react';
import { BarChart2, Eye } from 'lucide-react';
import './TopTabs.css';

export type TabType = 'analytics' | 'view-tracking';

interface TopTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TopTabs: React.FC<TopTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="top-nav-bar">
      <div className="top-nav-left">
        <div className="top-nav-brand">
          <span style={{ color: '#ff0000', fontSize: '20px' }}>▶</span>
          <span>YouTube Studio Analytics</span>
        </div>

        <nav className="top-tabs-container" aria-label="Main Navigation">
          <button
            type="button"
            className={`top-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => onTabChange('analytics')}
          >
            <span className="top-tab-icon">
              <BarChart2 size={18} />
            </span>
            <span>Analytics</span>
          </button>

          <button
            type="button"
            className={`top-tab-btn ${activeTab === 'view-tracking' ? 'active' : ''}`}
            onClick={() => onTabChange('view-tracking')}
          >
            <span className="top-tab-icon">
              <Eye size={18} />
            </span>
            <span>View Tracking</span>
            <span className="top-nav-badge">NEW</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
