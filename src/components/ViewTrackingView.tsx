import React, { useState, useRef } from 'react';
import { Plus, Download, RefreshCw, Trash2, ArrowDown, Settings, Scale } from 'lucide-react';
import html2canvas from 'html2canvas';
import './ViewTrackingView.css';

export interface TrafficSourceRow {
  id: string;
  title: string;
  pct: number; // Percentage float (e.g. 59.9 or 40)
  views: number; // View count
  color: string;
  checked: boolean;
}

// Preset color choices matching YouTube Studio UI
const COLOR_OPTIONS = [
  { name: 'Blue (Skippable ads)', hex: '#0666cc' },
  { name: 'Green (Display ads)', hex: '#7cb342' },
  { name: 'Orange (Non-skippable ads)', hex: '#f57c00' },
  { name: 'Purple (Bumper ads)', hex: '#8e24aa' },
  { name: 'Teal (Search)', hex: '#00897b' },
  { name: 'Red (External)', hex: '#d32f2f' }
];

export const ViewTrackingView: React.FC = () => {
  // State for Breadcrumbs
  const [parentSource, setParentSource] = useState('Traffic source');
  const [subSource, setSubSource] = useState('YouTube advertising');

  // Total Views numeric state (User editable input, e.g. 1455383 or 100)
  const [totalViewsNum, setTotalViewsNum] = useState<number>(1455383);

  // Auto-balance percentages to 100% toggle
  const [autoBalance, setAutoBalance] = useState<boolean>(true);

  // State for Number System format: 'indian' (14,55,383) vs 'international' (1,455,383)
  const [numberFormat, setNumberFormat] = useState<'indian' | 'international'>('indian');

  // State for Checkbox on Total row
  const [totalChecked, setTotalChecked] = useState(false);

  // Rows state initial defaults matching screenshot (59.9% + 40.1% = 100%)
  const [rows, setRows] = useState<TrafficSourceRow[]>([
    {
      id: '1',
      title: 'Skippable video ads (Auction)',
      pct: 59.9,
      views: Math.round(1455383 * (59.9 / 100)),
      color: '#0666cc',
      checked: false
    },
    {
      id: '2',
      title: 'Display ads',
      pct: 40.1,
      views: Math.round(1455383 * (40.1 / 100)),
      color: '#7cb342',
      checked: false
    }
  ]);

  const captureRef = useRef<HTMLDivElement>(null);

  // Helper to format Indian numbering system (e.g. 14,55,383) or International system (1,455,383)
  const formatNumber = (num: number): string => {
    if (isNaN(num)) return '0';
    if (numberFormat === 'international') {
      return num.toLocaleString('en-US');
    }
    // Indian formatting algorithm
    const str = Math.round(num).toString();
    if (str.length <= 3) return str;
    const lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `${formattedOther},${lastThree}`;
  };

  // Handler for changing Total Views Input
  const handleTotalViewsChange = (newTotal: number) => {
    const validTotal = isNaN(newTotal) ? 0 : Math.max(0, newTotal);
    setTotalViewsNum(validTotal);
    // Recalculate view counts for all rows based on their current percentages
    setRows(prevRows =>
      prevRows.map(r => ({
        ...r,
        views: Math.round(validTotal * (r.pct / 100))
      }))
    );
  };

  // Handler for changing a row's percentage %
  const handleRowPctChange = (targetId: string, inputPct: number) => {
    const boundedPct = isNaN(inputPct) ? 0 : Math.min(100, Math.max(0, inputPct));

    setRows(prevRows => {
      if (autoBalance && prevRows.length > 1) {
        const otherRows = prevRows.filter(r => r.id !== targetId);
        const remainingPct = Math.max(0, 100 - boundedPct);

        if (otherRows.length === 1) {
          // Exactly 2 rows (e.g., Skippable 40% -> Display 60%)
          const otherId = otherRows[0].id;
          const otherPct = parseFloat(remainingPct.toFixed(1));
          return prevRows.map(r => {
            if (r.id === targetId) {
              return {
                ...r,
                pct: boundedPct,
                views: Math.round(totalViewsNum * (boundedPct / 100))
              };
            }
            if (r.id === otherId) {
              return {
                ...r,
                pct: otherPct,
                views: Math.round(totalViewsNum * (otherPct / 100))
              };
            }
            return r;
          });
        } else {
          // Multiple rows auto-balance to sum up to 100%
          const otherSum = otherRows.reduce((sum, r) => sum + r.pct, 0);
          return prevRows.map(r => {
            if (r.id === targetId) {
              return {
                ...r,
                pct: boundedPct,
                views: Math.round(totalViewsNum * (boundedPct / 100))
              };
            }
            const scale = otherSum > 0 ? remainingPct / otherSum : remainingPct / otherRows.length;
            const adjPct = parseFloat((r.pct * scale).toFixed(1));
            return {
              ...r,
              pct: adjPct,
              views: Math.round(totalViewsNum * (adjPct / 100))
            };
          });
        }
      }

      // If auto balance is disabled, just update target row
      return prevRows.map(r => {
        if (r.id === targetId) {
          return {
            ...r,
            pct: boundedPct,
            views: Math.round(totalViewsNum * (boundedPct / 100))
          };
        }
        return r;
      });
    });
  };

  // Handler for changing a row's view count directly
  const handleRowViewsChange = (targetId: string, newViews: number) => {
    const validViews = isNaN(newViews) ? 0 : Math.max(0, newViews);
    const calculatedPct = totalViewsNum > 0 ? (validViews / totalViewsNum) * 100 : 0;
    handleRowPctChange(targetId, parseFloat(calculatedPct.toFixed(1)));
  };

  // Update other row properties (title, color, checked)
  const handleUpdateRowProp = (id: string, key: keyof TrafficSourceRow, value: any) => {
    setRows(rows.map(r => (r.id === id ? { ...r, [key]: value } : r)));
  };

  // Add new traffic source row
  const handleAddRow = () => {
    const newId = Date.now().toString();
    const nextColor = COLOR_OPTIONS[rows.length % COLOR_OPTIONS.length].hex;
    const currentSumPct = rows.reduce((sum, r) => sum + r.pct, 0);
    const newPct = autoBalance ? Math.max(0, 100 - currentSumPct) : 20;

    setRows([
      ...rows,
      {
        id: newId,
        title: `New Traffic Source ${rows.length + 1}`,
        pct: newPct,
        views: Math.round(totalViewsNum * (newPct / 100)),
        color: nextColor,
        checked: false
      }
    ]);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    if (rows.length <= 1) {
      alert('You must keep at least one traffic source row.');
      return;
    }
    const remainingRows = rows.filter(r => r.id !== id);
    if (autoBalance && remainingRows.length > 0) {
      const scale = 100 / remainingRows.reduce((sum, r) => sum + r.pct, 0);
      setRows(
        remainingRows.map(r => {
          const adjPct = parseFloat((r.pct * scale).toFixed(1));
          return {
            ...r,
            pct: adjPct,
            views: Math.round(totalViewsNum * (adjPct / 100))
          };
        })
      );
    } else {
      setRows(remainingRows);
    }
  };

  // Reset to original screenshot defaults (14,55,383 total)
  const handleResetDefaults = () => {
    setParentSource('Traffic source');
    setSubSource('YouTube advertising');
    setTotalViewsNum(1455383);
    setNumberFormat('indian');
    setAutoBalance(true);
    setTotalChecked(false);
    setRows([
      {
        id: '1',
        title: 'Skippable video ads (Auction)',
        pct: 59.9,
        views: 871774,
        color: '#0666cc',
        checked: false
      },
      {
        id: '2',
        title: 'Display ads',
        pct: 40.1,
        views: 583609,
        color: '#7cb342',
        checked: false
      }
    ]);
  };

  // Export Screenshot PNG
  const handleDownloadScreenshot = async () => {
    if (!captureRef.current) return;
    try {
      const cardEl = captureRef.current;
      const canvas = await html2canvas(cardEl, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `YouTube_View_Tracking_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      alert('Failed to generate screenshot.');
    }
  };

  return (
    <div className="view-tracking-container">
      {/* Visual Preview Card matching exact YouTube Studio Screenshot */}
      <div className="vt-card" ref={captureRef}>
        {/* Single Header Row: Breadcrumb + (+) Plus Icon Button + Grid Line + Views Column */}
        <div className="vt-table-header-row">
          <div className="vt-header-left">
            <div className="vt-breadcrumb">
              <span className="vt-breadcrumb-parent">{parentSource}</span>
              <span className="vt-breadcrumb-separator">&gt;</span>
              <span className="vt-breadcrumb-sub">{subSource}</span>
            </div>
            <button
              type="button"
              className="vt-header-add-btn"
              title="Add traffic source"
              onClick={handleAddRow}
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>

          <div className="vt-header-right">
            <span>Views</span>
            <ArrowDown size={14} />
          </div>
        </div>

        {/* Table Body */}
        <div className="vt-table-body">
          {/* Total Row */}
          <div className="vt-table-row total-row">
            <div className="vt-row-left">
              <div className="vt-color-bar-container"></div>
              <div className="vt-checkbox-container">
                <div
                  className={`vt-checkbox ${totalChecked ? 'checked' : ''}`}
                  style={{
                    borderColor: totalChecked ? '#0d0d0d' : '#606060',
                    backgroundColor: totalChecked ? '#0d0d0d' : '#ffffff'
                  }}
                  onClick={() => setTotalChecked(!totalChecked)}
                >
                  {totalChecked && <span className="vt-checkbox-check">✓</span>}
                </div>
              </div>
              <span className="vt-row-title bold">Total</span>
            </div>

            <div className="vt-row-right">
              <span className="vt-row-views bold">{formatNumber(totalViewsNum)}</span>
            </div>
          </div>

          {/* Dynamic Traffic Source Rows */}
          {rows.map((row) => (
            <div className="vt-table-row" key={row.id}>
              <div className="vt-row-left">
                {/* Vertical Accent Color Bar */}
                <div className="vt-color-bar-container">
                  <div
                    className="vt-color-bar"
                    style={{ backgroundColor: row.color }}
                  ></div>
                </div>

                {/* Checkbox with Border Color MATCHING Left Line Color! */}
                <div className="vt-checkbox-container">
                  <div
                    className={`vt-checkbox ${row.checked ? 'checked' : ''}`}
                    style={{
                      borderColor: row.color,
                      backgroundColor: row.checked ? row.color : '#ffffff'
                    }}
                    onClick={() => handleUpdateRowProp(row.id, 'checked', !row.checked)}
                  >
                    {row.checked && <span className="vt-checkbox-check">✓</span>}
                  </div>
                </div>

                {/* Row Title */}
                <span className="vt-row-title">{row.title}</span>
              </div>

              {/* Views & Percentage */}
              <div className="vt-row-right">
                <span className="vt-row-views">{formatNumber(row.views)}</span>
                <span className="vt-row-pct">{row.pct.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Control Panel for View Tracking */}
      <div className="vt-control-panel">
        <div className="vt-cp-header">
          <div className="vt-cp-title">
            <Settings size={18} color="#1a73e8" />
            <span>View Tracking Control Panel</span>
          </div>

          {/* 100% Auto Balance Toggle Button */}
          <button
            type="button"
            className={`vt-cp-btn-toggle ${autoBalance ? 'active' : ''}`}
            onClick={() => setAutoBalance(!autoBalance)}
            title="Automatically balance item percentages to sum 100%"
          >
            <Scale size={14} />
            <span>{autoBalance ? '100% Auto-Balance: ON' : '100% Auto-Balance: OFF'}</span>
          </button>
        </div>

        {/* Global Settings Grid */}
        <div className="vt-cp-grid">
          {/* Total Views Input Field */}
          <div className="vt-cp-field" style={{ gridColumn: '1 / -1', backgroundColor: '#e8f0fe', padding: '12px', borderRadius: '6px', border: '1.5px solid #1a73e8' }}>
            <label className="vt-cp-label" style={{ color: '#1a73e8', fontWeight: 600, fontSize: '14px' }}>
              📊 Total Views Input (Overall Views)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <input
                type="number"
                className="vt-cp-input"
                style={{ flex: 1, backgroundColor: '#ffffff', fontWeight: 600, fontSize: '16px', color: '#1a73e8' }}
                placeholder="Enter total views (e.g. 100 or 1455383)"
                value={totalViewsNum === 0 ? '' : totalViewsNum}
                onChange={(e) => handleTotalViewsChange(parseInt(e.target.value) || 0)}
              />
              <span style={{ fontSize: '13px', color: '#3c4043', fontWeight: 500 }}>
                Formatted: <strong>{formatNumber(totalViewsNum)}</strong>
              </span>
            </div>
          </div>

          <div className="vt-cp-field">
            <label className="vt-cp-label">Parent Breadcrumb Title</label>
            <input
              type="text"
              className="vt-cp-input"
              value={parentSource}
              onChange={(e) => setParentSource(e.target.value)}
            />
          </div>

          <div className="vt-cp-field">
            <label className="vt-cp-label">Sub-Category Title</label>
            <input
              type="text"
              className="vt-cp-input"
              value={subSource}
              onChange={(e) => setSubSource(e.target.value)}
            />
          </div>

          <div className="vt-cp-field" style={{ gridColumn: '1 / -1' }}>
            <label className="vt-cp-label">Number Formatting System</label>
            <select
              className="vt-cp-select"
              value={numberFormat}
              onChange={(e) => setNumberFormat(e.target.value as any)}
            >
              <option value="indian">Indian System (14,55,383 - Screenshot Match)</option>
              <option value="international">International System (1,455,383)</option>
            </select>
          </div>
        </div>

        {/* Rows Editor Section */}
        <div className="vt-cp-rows-editor">
          <div className="vt-cp-rows-header">
            <span className="vt-cp-rows-title">
              Traffic Source Items ({rows.reduce((sum, r) => sum + r.pct, 0).toFixed(1)}% Total)
            </span>
            <button
              type="button"
              className="vt-cp-btn-add"
              onClick={handleAddRow}
            >
              <Plus size={14} /> Add Source Row
            </button>
          </div>

          {rows.map((row) => (
            <div className="vt-row-item-editor" key={row.id}>
              {/* Color Selector */}
              <input
                type="color"
                className="vt-color-swatch-picker"
                value={row.color}
                onChange={(e) => handleUpdateRowProp(row.id, 'color', e.target.value)}
                title="Change indicator bar color"
              />

              {/* Title Input */}
              <input
                type="text"
                className="vt-cp-input"
                style={{ flex: 2 }}
                placeholder="Source Title"
                value={row.title}
                onChange={(e) => handleUpdateRowProp(row.id, 'title', e.target.value)}
              />

              {/* Percentage Input (%) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  step="0.1"
                  className="vt-cp-input"
                  style={{ width: '80px', fontWeight: 600, color: '#0666cc' }}
                  placeholder="%"
                  value={row.pct}
                  onChange={(e) => handleRowPctChange(row.id, parseFloat(e.target.value))}
                  title="Percentage of Total Views"
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#5f6368' }}>%</span>
              </div>

              {/* Calculated / Editable Views Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <input
                  type="number"
                  className="vt-cp-input"
                  style={{ width: '100%' }}
                  placeholder="Views Count"
                  value={row.views}
                  onChange={(e) => handleRowViewsChange(row.id, parseInt(e.target.value) || 0)}
                  title="Views count"
                />
              </div>

              {/* Delete Row Button */}
              <button
                type="button"
                className="vt-cp-btn-delete"
                onClick={() => handleDeleteRow(row.id)}
                title="Delete this row"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Control Panel Action Buttons */}
        <div className="vt-cp-actions">
          <button
            type="button"
            className="vt-btn-secondary"
            onClick={handleResetDefaults}
          >
            <RefreshCw size={16} /> Reset Screenshot Defaults
          </button>

          <button
            type="button"
            className="vt-btn-primary"
            onClick={handleDownloadScreenshot}
          >
            <Download size={16} /> Download High-Res Screenshot (PNG)
          </button>
        </div>
      </div>
    </div>
  );
};
