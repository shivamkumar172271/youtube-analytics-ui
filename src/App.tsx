import { useState, useRef } from 'react';
import { X, Download, Link as LinkIcon, Upload, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ads' | 'youtube'>('ads');

  // Video data states - initially empty until user fetches or inputs data
  const [hasFetched, setHasFetched] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [artist, setArtist] = useState('');
  const [impressions, setImpressions] = useState('');
  const [trueViewViews, setTrueViewViews] = useState('');
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);

  // Control Panel state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [impPercentBoost, setImpPercentBoost] = useState('');
  const [viewsPercentBoost, setViewsPercentBoost] = useState('');
  const [ctrPercent, setCtrPercent] = useState('');

  const captureRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to parse metric string like "450K", "1.2M", "5000" into a number
  const parseMetricValue = (val: string): number => {
    if (!val) return 0;
    const cleanStr = val.trim().toUpperCase();
    if (cleanStr.endsWith('K')) {
      return parseFloat(cleanStr.replace('K', '')) * 1000;
    }
    if (cleanStr.endsWith('M')) {
      return parseFloat(cleanStr.replace('M', '')) * 1000000;
    }
    if (cleanStr.endsWith('B')) {
      return parseFloat(cleanStr.replace('B', '')) * 1000000000;
    }
    return parseFloat(cleanStr) || 0;
  };

  // Helper to format number back into clean metric string like "540K", "1.4M", etc.
  const formatMetricValue = (num: number): string => {
    if (isNaN(num) || num <= 0) return '0';
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return Math.round(num / 1000) + 'K';
    }
    return Math.round(num).toString();
  };

  // Separate Percentage Boost for Impressions
  const handleApplyImpBoost = (overridePercent?: number) => {
    const percent = overridePercent !== undefined ? overridePercent : parseFloat(impPercentBoost);
    if (isNaN(percent) || percent === 0) return;

    const currentImp = parseMetricValue(impressions);
    const newImp = currentImp > 0 ? Math.round(currentImp * (1 + percent / 100)) : 0;

    if (newImp > 0) {
      setImpressions(formatMetricValue(newImp));
      if (!hasFetched) setHasFetched(true);
    }
  };

  // Separate Percentage Boost for TrueView Views
  const handleApplyViewsBoost = (overridePercent?: number) => {
    const percent = overridePercent !== undefined ? overridePercent : parseFloat(viewsPercentBoost);
    if (isNaN(percent) || percent === 0) return;

    const currentViews = parseMetricValue(trueViewViews);
    const newViews = currentViews > 0 ? Math.round(currentViews * (1 + percent / 100)) : 0;

    if (newViews > 0) {
      setTrueViewViews(formatMetricValue(newViews));
      if (!hasFetched) setHasFetched(true);
    }
  };

  // Excel Formula: Impressions = IF(CTR<>0, Views / (CTR/100), 0)
  const handleCalculateImpressionsFromCTR = (overrideCTR?: number) => {
    const ctr = overrideCTR !== undefined ? overrideCTR : parseFloat(ctrPercent);
    if (isNaN(ctr) || ctr <= 0) return;

    const views = parseMetricValue(trueViewViews);
    if (views <= 0) return;

    const calculatedImp = Math.round(views / (ctr / 100));
    if (calculatedImp > 0) {
      setImpressions(formatMetricValue(calculatedImp));
      if (!hasFetched) setHasFetched(true);
    }
  };

  // Excel Formula: Views = Impressions * (CTR/100)
  const handleCalculateViewsFromCTR = (overrideCTR?: number) => {
    const ctr = overrideCTR !== undefined ? overrideCTR : parseFloat(ctrPercent);
    if (isNaN(ctr) || ctr <= 0) return;

    const imp = parseMetricValue(impressions);
    if (imp <= 0) return;

    const calculatedViews = Math.round(imp * (ctr / 100));
    if (calculatedViews > 0) {
      setTrueViewViews(formatMetricValue(calculatedViews));
      if (!hasFetched) setHasFetched(true);
    }
  };

  // Fetch YouTube Title & Thumbnail using noembed
  const handleFetchYoutube = async () => {
    if (!youtubeUrl.trim()) return;
    setIsFetching(true);
    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(youtubeUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setVideoTitle(data.title);
        } else {
          setVideoTitle('YouTube Video');
        }
        if (data.author_name) {
          setArtist(data.author_name);
        } else {
          setArtist('YouTube Channel');
        }
        if (data.thumbnail_url) {
          setCustomThumbnail(data.thumbnail_url);
        }
        setDuration('03:15');
        setImpressions('450K');
        setTrueViewViews('280K');
        setHasFetched(true);
      } else {
        alert('Could not fetch YouTube details. Please check the URL.');
      }
    } catch (e) {
      alert('Could not fetch YouTube details. Please check the URL.');
    } finally {
      setIsFetching(false);
    }
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomThumbnail(event.target?.result as string);
        setHasFetched(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Download high-resolution PNG screenshot
  const handleDownloadScreenshot = async () => {
    if (!hasFetched) {
      alert('Please fetch a YouTube link first before downloading analytics.');
      return;
    }
    if (!captureRef.current) return;
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const cleanFileName = (videoTitle || 'analytics')
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);

      const link = document.createElement('a');
      link.download = `YouTube-Analytics-${cleanFileName || 'screenshot'}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Screenshot generation error:', err);
    }
  };

  // Reset to clear defaults
  const handleResetDefaults = () => {
    setVideoTitle('');
    setDuration('');
    setArtist('');
    setImpressions('');
    setTrueViewViews('');
    setCustomThumbnail(null);
    setYoutubeUrl('');
    setHasFetched(false);
    setActiveTab('ads');
  };

  return (
    <div className="page-wrapper">
      {/* ── SCREENSHOT CAPTURE AREA ── */}
      <div className="capture-card" ref={captureRef} id="capture-area">
        {/* Header */}
        <header className="analytics-header">
          <button className="close-btn" type="button" aria-label="Close">
            <X size={20} />
          </button>
          <h1 className="header-title">Analytics</h1>
        </header>

        {/* Tab Navigation */}
        <nav className="tabs-navigation">
          <button
            className={`tab-item ${activeTab === 'ads' ? 'active' : ''}`}
            onClick={() => setActiveTab('ads')}
            type="button"
          >
            Ads data
            {activeTab === 'ads' && <div className="tab-indicator" />}
          </button>
          <button
            className={`tab-item ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
            type="button"
          >
            YouTube Analytics
            {activeTab === 'youtube' && <div className="tab-indicator" />}
          </button>
        </nav>

        {!hasFetched ? (
          /* Empty State when no link has been fetched yet */
          <div className="empty-analytics-state">
            <div className="empty-icon-wrapper">
              <LinkIcon size={32} color="#1a73e8" />
            </div>
            <h3 className="empty-title">No Video Analytics Fetched</h3>
            <p className="empty-subtitle">
              Paste a YouTube video link in the control panel below and click <strong>Fetch Data</strong> to generate the analytics dashboard.
            </p>
          </div>
        ) : (
          <>
            {/* Main Analytics Row */}
            <div className="analytics-content">
              {/* Left: Thumbnail & Info */}
              <div className="video-info-group">
                <div className="thumbnail-box">
                  {customThumbnail ? (
                    <img src={customThumbnail} alt="Video thumbnail" className="thumbnail-img" />
                  ) : (
                    <div className="default-artwork">
                      <div className="artwork-center">
                        <div className="artwork-title">{videoTitle ? videoTitle.substring(0, 10) : 'VIDEO'}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="video-details">
                  <div className="video-title" title={videoTitle || 'Untitled Video'}>
                    {videoTitle || 'Untitled Video'}
                  </div>
                  <div className="video-meta-subtitle">
                    <span>{duration || '00:00'}</span>
                    <span className="meta-dot">·</span>
                    <span>{artist || 'Unknown Channel'}</span>
                  </div>
                </div>
              </div>

              {/* Right: Metrics */}
              <div className="metrics-group">
                <div className="metric-column">
                  <span className="metric-label">Impressions</span>
                  <span className="metric-value">{impressions || '0'}</span>
                </div>
                <div className="metric-column">
                  <span className="metric-label">TrueView views</span>
                  <span className="metric-value dashed-underline">{trueViewViews || '0'}</span>
                </div>
              </div>
            </div>

            {/* Audience Retention Header */}
            <div className="audience-retention-section">
              <div className="retention-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 17 8 11 13 16 22 7" />
                </svg>
                <span className="retention-title">Audience retention</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── DEVELOPER CONTROLS PANEL ── */}
      <div className="controls-card">
        <h2 className="controls-title">
          <span>⚙️ Live Customization &amp; Controls</span>
        </h2>

        <div className="control-grid">
          {/* YouTube Link Fetcher */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Fetch Analytics from YouTube URL</label>
            <div className="fetch-row">
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFetchYoutube();
                }}
              />
              <button
                className="btn-primary"
                onClick={handleFetchYoutube}
                disabled={isFetching}
                type="button"
              >
                <LinkIcon size={16} />
                {isFetching ? 'Fetching...' : 'Fetch Data'}
              </button>
            </div>
          </div>

          {/* Video Title */}
          <div className="form-group">
            <label className="form-label">Video Title</label>
            <input
              type="text"
              className="form-input"
              value={videoTitle}
              placeholder="e.g. Video Title"
              onChange={(e) => {
                setVideoTitle(e.target.value);
                if (!hasFetched) setHasFetched(true);
              }}
            />
          </div>

          {/* Artist / Channel Name */}
          <div className="form-group">
            <label className="form-label">Artist / Channel Name</label>
            <input
              type="text"
              className="form-input"
              value={artist}
              placeholder="e.g. Channel Name"
              onChange={(e) => {
                setArtist(e.target.value);
                if (!hasFetched) setHasFetched(true);
              }}
            />
          </div>

          {/* Video Duration */}
          <div className="form-group">
            <label className="form-label">Video Duration</label>
            <input
              type="text"
              className="form-input"
              value={duration}
              placeholder="e.g. 03:01"
              onChange={(e) => {
                setDuration(e.target.value);
                if (!hasFetched) setHasFetched(true);
              }}
            />
          </div>

          {/* Impressions */}
          <div className="form-group">
            <label className="form-label">Impressions</label>
            <input
              type="text"
              className="form-input"
              value={impressions}
              placeholder="e.g. 500K"
              onChange={(e) => {
                setImpressions(e.target.value);
                if (!hasFetched) setHasFetched(true);
              }}
            />
          </div>

          {/* TrueView views */}
          <div className="form-group">
            <label className="form-label">TrueView Views</label>
            <input
              type="text"
              className="form-input"
              value={trueViewViews}
              placeholder="e.g. 300K"
              onChange={(e) => {
                setTrueViewViews(e.target.value);
                if (!hasFetched) setHasFetched(true);
              }}
            />
          </div>

          {/* Custom Thumbnail Upload */}
          <div className="form-group">
            <label className="form-label">Custom Thumbnail</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <button
                className="btn-secondary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Upload size={16} /> Upload Image
              </button>
              {customThumbnail && (
                <button
                  className="btn-secondary"
                  onClick={() => setCustomThumbnail(null)}
                  type="button"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Boost Impressions by Percentage (%) */}
          <div className="form-group">
            <label className="form-label">Boost Impressions by %</label>
            <div className="fetch-row">
              <input
                type="number"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="e.g. 20 for +20%"
                value={impPercentBoost}
                onChange={(e) => setImpPercentBoost(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyImpBoost();
                }}
              />
              <button
                className="btn-primary"
                onClick={() => handleApplyImpBoost()}
                type="button"
              >
                + Boost
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleApplyImpBoost(10)} type="button">+10%</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleApplyImpBoost(20)} type="button">+20%</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleApplyImpBoost(50)} type="button">+50%</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleApplyImpBoost(100)} type="button">+100%</button>
            </div>
          </div>

          {/* Boost TrueView Views by Percentage (%) */}
          <div className="form-group">
            <label className="form-label">Boost TrueView Views by %</label>
            <div className="fetch-row">
              <input
                type="number"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="e.g. 20 for +20%"
                value={viewsPercentBoost}
                onChange={(e) => setViewsPercentBoost(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyViewsBoost();
                }}
              />
              <button
                className="btn-primary"
                onClick={() => handleApplyViewsBoost()}
                type="button"
              >
                + Boost
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleApplyViewsBoost(10)} type="button">+10%</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleApplyViewsBoost(20)} type="button">+20%</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleApplyViewsBoost(50)} type="button">+50%</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleApplyViewsBoost(100)} type="button">+100%</button>
            </div>
          </div>

          {/* CTR % Auto-Calculator (Excel Formula: Impressions = Views / (CTR % / 100)) */}
          <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e8eaed' }}>
            <label className="form-label">CTR % Calculation (Excel Formula: Impressions = Views / (CTR % / 100))</label>
            <div className="fetch-row">
              <input
                type="number"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Enter CTR % e.g. 53 for 53% or 40 for 40%"
                value={ctrPercent}
                onChange={(e) => setCtrPercent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCalculateImpressionsFromCTR();
                }}
              />
              <button
                className="btn-primary"
                onClick={() => handleCalculateImpressionsFromCTR()}
                type="button"
              >
                Calc Impressions
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleCalculateViewsFromCTR()}
                type="button"
              >
                Calc Views
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#5f6368' }}>CTR Presets:</span>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => { setCtrPercent('4'); handleCalculateImpressionsFromCTR(4); }} type="button">4% CTR</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => { setCtrPercent('10'); handleCalculateImpressionsFromCTR(10); }} type="button">10% CTR</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => { setCtrPercent('40'); handleCalculateImpressionsFromCTR(40); }} type="button">40% CTR</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => { setCtrPercent('53'); handleCalculateImpressionsFromCTR(53); }} type="button">53% CTR</button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-bar">
          <button className="btn-secondary" onClick={handleResetDefaults} type="button">
            <RefreshCw size={16} /> Clear / Reset
          </button>
          <button
            className="download-btn"
            onClick={handleDownloadScreenshot}
            disabled={!hasFetched}
            style={{ opacity: hasFetched ? 1 : 0.6, cursor: hasFetched ? 'pointer' : 'not-allowed' }}
            type="button"
          >
            <Download size={18} /> Download High-Res Screenshot (PNG)
          </button>
        </div>
      </div>
    </div>
  );
}

