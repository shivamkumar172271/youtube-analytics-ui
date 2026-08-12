import { useState } from 'react';
import App from './App';
import { TopTabs, type TabType } from './components/TopTabs';
import { ViewTrackingView } from './components/ViewTrackingView';

export default function AppContainer() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');

  return (
    <div className="app-main-layout">
      {/* Top Header Tabs */}
      <TopTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Render active view while preserving App.tsx 100% untouched */}
      {activeTab === 'analytics' ? (
        <App />
      ) : (
        <ViewTrackingView />
      )}
    </div>
  );
}
