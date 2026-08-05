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
  const [ctrPercent, setCtrPercent] = useState('');

  const captureRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to parse metric string like "450K", "1.2M", "1,200", "200" into a number
  const parseMetricValue = (val: string): number => {
    if (!val) return 0;
    // Strip commas, spaces, and formatting characters
    const cleanStr = val.toString().replace(/,/g, '').trim().toUpperCase();
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

  // Helper to format number back into clean metric string like "540K", "1.4M", "250", etc.
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

  // Excel Formula: Impressions = IF(CTR<>0, Views / (CTR/100), 0) (Uses current updated Views input)
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

  // Excel Formula: Views = Impressions * (CTR/100) (Uses current updated Impressions input)
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



  // Truncate title string with "..." if long, ensuring html2canvas canvas export renders the "..." dot reliably
  const formatTitleWithEllipsis = (title: string, maxLength: number = 31) => {
    if (!title) return 'Untitled Video';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + '...';
  };

  // Convert URL image to Base64 to ensure pixel-perfect rendering in html2canvas without CORS distortion
  const convertUrlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
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
          const base64Thumb = await convertUrlToBase64(data.thumbnail_url);
          setCustomThumbnail(base64Thumb);
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

  // Download high-resolution PNG screenshot (Always exports in compact Desktop layout width 740px)
  const handleDownloadScreenshot = async () => {
    if (!hasFetched) {
      alert('Please fetch a YouTube link first before downloading analytics.');
      return;
    }
    if (!captureRef.current) return;
    try {
      const cardEl = captureRef.current;

      // Save original styles
      const origWidth = cardEl.style.width;
      const origMinWidth = cardEl.style.minWidth;
      const origMaxWidth = cardEl.style.maxWidth;

      // Enforce Desktop layout dimensions during screenshot capture (740px)
      cardEl.style.width = '740px';
      cardEl.style.minWidth = '740px';
      cardEl.style.maxWidth = '740px';

      const canvas = await html2canvas(cardEl, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        windowWidth: 1024,
        onclone: (_clonedDoc, element) => {
          element.style.width = '740px';
          element.style.minWidth = '740px';
          element.style.maxWidth = '740px';
          element.style.boxSizing = 'border-box';

          const header = element.querySelector('.analytics-header') as HTMLElement;
          if (header) {
            header.style.borderBottom = 'none';
            header.style.boxShadow = '0px 3px 6px rgba(0, 0, 0, 0.12)';
          }

          const content = element.querySelector('.analytics-content') as HTMLElement;
          if (content) {
            content.style.display = 'flex';
            content.style.flexDirection = 'row';
            content.style.flexWrap = 'nowrap';
            content.style.justifyContent = 'flex-start';
            content.style.gap = '44px';
            content.style.width = 'calc(100% + 48px)';
            content.style.marginLeft = '-24px';
            content.style.marginRight = '-24px';
            content.style.boxSizing = 'border-box';
            content.style.borderTop = '1px solid #dadce0';
            content.style.borderBottom = '1px solid #dadce0';
          }
          const videoGroup = element.querySelector('.video-info-group') as HTMLElement;
          if (videoGroup) {
            videoGroup.style.flexShrink = '0';
            videoGroup.style.display = 'flex';
            videoGroup.style.flexDirection = 'row';
          }
          const metricsGroup = element.querySelector('.metrics-group') as HTMLElement;
          if (metricsGroup) {
            metricsGroup.style.flexShrink = '0';
            metricsGroup.style.display = 'flex';
            metricsGroup.style.flexDirection = 'row';
            metricsGroup.style.gap = '48px';
          }
        }
      });

      // Restore original inline styles
      cardEl.style.width = origWidth;
      cardEl.style.minWidth = origMinWidth;
      cardEl.style.maxWidth = origMaxWidth;

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
                    <div
                      className="thumbnail-img-bg"
                      style={{ backgroundImage: `url(${customThumbnail})` }}
                    />
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
                    {formatTitleWithEllipsis(videoTitle || 'Untitled Video')}
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
              placeholder="e.g. 500K or 500000"
              onChange={(e) => {
                setImpressions(e.target.value);
                if (!hasFetched) setHasFetched(true);
              }}
              onBlur={() => {
                if (impressions.trim()) {
                  const parsed = parseMetricValue(impressions);
                  if (parsed > 0) setImpressions(formatMetricValue(parsed));
                }
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
              placeholder="e.g. 300K or 300000"
              onChange={(e) => {
                setTrueViewViews(e.target.value);
                if (!hasFetched) setHasFetched(true);
              }}
              onBlur={() => {
                if (trueViewViews.trim()) {
                  const parsed = parseMetricValue(trueViewViews);
                  if (parsed > 0) setTrueViewViews(formatMetricValue(parsed));
                }
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

          {/* CTR % Calculator (Excel Formula: Impressions = Views / (CTR % / 100)) */}
          <div
            className="form-group"
            style={{
              gridColumn: '1 / -1',
              margin: '12px 0',
              padding: '16px',
              backgroundColor: '#f0f4f9',
              border: '1.5px solid #c2e7ff',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(26, 115, 232, 0.08)'
            }}
          >
            <label className="form-label" style={{ color: '#1a73e8', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
              📊 CTR % Calculator (Excel Formula: Impressions = Views / (CTR % / 100))
            </label>
            <span style={{ fontSize: '12px', color: '#5f6368', marginBottom: '8px', display: 'block' }}>
              Enter CTR % to calculate Impressions from Views, or Views from Impressions.
            </span>
            <div className="fetch-row" style={{ gap: '10px' }}>
              <input
                type="number"
                className="form-input"
                style={{ flex: 1, backgroundColor: '#ffffff', borderColor: '#a8c7fa', fontWeight: 500 }}
                placeholder="Enter CTR % (e.g. 53 for 53% or 40 for 40%)"
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
                style={{ backgroundColor: '#1a73e8', fontWeight: 600 }}
              >
                Calc Impressions
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleCalculateViewsFromCTR()}
                type="button"
                style={{ backgroundColor: '#ffffff', borderColor: '#1a73e8', color: '#1a73e8', fontWeight: 600 }}
              >
                Calc Views
              </button>
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

