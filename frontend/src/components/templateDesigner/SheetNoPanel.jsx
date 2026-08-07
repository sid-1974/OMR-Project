import React from 'react';
import SearchableDropdown from '../SearchableDropdown';

const SheetNoPanel = ({ sheetNoConfig, setSheetNoConfig }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="checkbox" id="sheet-enabled" checked={sheetNoConfig.enabled} onChange={(e) => setSheetNoConfig({ ...sheetNoConfig, enabled: e.target.checked })} />
        <label htmlFor="sheet-enabled" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable Sheet Number Area</label>
      </div>
      {sheetNoConfig.enabled && (
        <>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>OMR ID Input Mode</label>
            <SearchableDropdown
              options={[
                { label: "1. Barcode / QR Code", value: "barcode" },
                { label: "2. Number Only (Manual Entry)", value: "manual_entry" }
              ]}
              value={sheetNoConfig.mode || 'barcode'}
              onChange={(val) => setSheetNoConfig({ ...sheetNoConfig, mode: val })}
            />
          </div>

          {sheetNoConfig.mode === 'barcode' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Box X</label>
                  <input type="number" className="form-input" value={sheetNoConfig.x} onChange={(e) => setSheetNoConfig({ ...sheetNoConfig, x: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Box Y</label>
                  <input type="number" className="form-input" value={sheetNoConfig.y} onChange={(e) => setSheetNoConfig({ ...sheetNoConfig, y: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Width</label>
                  <input type="number" className="form-input" value={sheetNoConfig.width} onChange={(e) => setSheetNoConfig({ ...sheetNoConfig, width: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Height</label>
                  <input type="number" className="form-input" value={sheetNoConfig.height} onChange={(e) => setSheetNoConfig({ ...sheetNoConfig, height: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Position the purple bounding box on the OMR sheet to define the Barcode/QR Code scanning zone.
              </div>
            </div>
          )}

          {sheetNoConfig.mode === 'manual_entry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>OMR ID (Manual)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. OMR-101"
                  value={sheetNoConfig.omr_id || ''}
                  onChange={(e) => setSheetNoConfig({ ...sheetNoConfig, omr_id: e.target.value })}
                />
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enter the OMR ID to be saved automatically for all sheets scanned using this template.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SheetNoPanel;
