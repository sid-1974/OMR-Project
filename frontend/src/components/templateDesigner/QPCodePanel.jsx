import React from 'react';
import SearchableDropdown from '../SearchableDropdown';

const QPCodePanel = ({ qpCodeConfig, setQpCodeConfig }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="checkbox" id="qpcode-enabled" checked={qpCodeConfig.enabled} onChange={(e) => setQpCodeConfig({ ...qpCodeConfig, enabled: e.target.checked })} />
        <label htmlFor="qpcode-enabled" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable QP Code Grid</label>
      </div>
      {qpCodeConfig.enabled && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Grid X</label>
              <input type="number" className="form-input" value={qpCodeConfig.x} onChange={(e) => setQpCodeConfig({ ...qpCodeConfig, x: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Grid Y</label>
              <input type="number" className="form-input" value={qpCodeConfig.y} onChange={(e) => setQpCodeConfig({ ...qpCodeConfig, y: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Width</label>
              <input type="number" className="form-input" value={qpCodeConfig.width} onChange={(e) => setQpCodeConfig({ ...qpCodeConfig, width: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Height</label>
              <input type="number" className="form-input" value={qpCodeConfig.height} onChange={(e) => setQpCodeConfig({ ...qpCodeConfig, height: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Digits (Cols)</label>
              <input type="number" className="form-input" value={qpCodeConfig.columns} onChange={(e) => setQpCodeConfig({ ...qpCodeConfig, columns: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Radius</label>
              <input type="number" className="form-input" value={qpCodeConfig.bubbleRadius} onChange={(e) => setQpCodeConfig({ ...qpCodeConfig, bubbleRadius: parseInt(e.target.value) || 1 })} />
            </div>
            {qpCodeConfig.rows === 10 && (
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Digit Sequence</label>
                <SearchableDropdown
                  options={[
                    { label: "0 to 9 (0, 1, 2... 9)", value: "0-9" },
                    { label: "1 to 0 (1, 2, 3... 0)", value: "1-0" }
                  ]}
                  value={qpCodeConfig.sequence || '0-9'}
                  onChange={(val) => setQpCodeConfig({ ...qpCodeConfig, sequence: val })}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default QPCodePanel;
