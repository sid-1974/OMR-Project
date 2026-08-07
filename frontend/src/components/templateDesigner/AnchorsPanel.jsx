import React from 'react';
import { HelpCircle } from 'lucide-react';
import SearchableDropdown from '../SearchableDropdown';

const AnchorsPanel = ({ anchors, setAnchors, timingMarksConfig, setTimingMarksConfig }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label className="form-label">Anchor Strategy</label>
        <SearchableDropdown
          options={[
            { label: "4 Corner Marks (Default)", value: "4_corners" },
            { label: "Timing Marks (Left/Right Tracks)", value: "timing_marks" }
          ]}
          value={anchors.type || '4_corners'}
          onChange={(val) => setAnchors({ ...anchors, type: val })}
        />
      </div>

      {(!anchors.type || anchors.type === '4_corners') && (
        <>
          <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <HelpCircle size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span>Drag the 4 red circles on the canvas directly onto the black alignment marks on the sheet.</span>
          </div>
          {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map(key => (
            <div key={key} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', width: '90px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{key}:</span>
              <input type="number" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={anchors[key]?.x || 0} onChange={(e) => setAnchors({ ...anchors, [key]: { ...anchors[key], x: parseInt(e.target.value) || 0 } })} placeholder="X" />
              <input type="number" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={anchors[key]?.y || 0} onChange={(e) => setAnchors({ ...anchors, [key]: { ...anchors[key], y: parseInt(e.target.value) || 0 } })} placeholder="Y" />
            </div>
          ))}
        </>
      )}

      {anchors.type === 'timing_marks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <HelpCircle size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span>Drag the pink bounding boxes completely over the left and right timing mark tracks.</span>
          </div>
          {['left', 'right'].map(side => (
            <div key={side} style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ textTransform: 'capitalize', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{side} Timing Track</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>X</label>
                  <input type="number" className="form-input" value={timingMarksConfig[side].x} onChange={(e) => setTimingMarksConfig({ ...timingMarksConfig, [side]: { ...timingMarksConfig[side], x: parseInt(e.target.value) || 0 } })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Y</label>
                  <input type="number" className="form-input" value={timingMarksConfig[side].y} onChange={(e) => setTimingMarksConfig({ ...timingMarksConfig, [side]: { ...timingMarksConfig[side], y: parseInt(e.target.value) || 0 } })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Width</label>
                  <input type="number" className="form-input" value={timingMarksConfig[side].width} onChange={(e) => setTimingMarksConfig({ ...timingMarksConfig, [side]: { ...timingMarksConfig[side], width: parseInt(e.target.value) || 0 } })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Height</label>
                  <input type="number" className="form-input" value={timingMarksConfig[side].height} onChange={(e) => setTimingMarksConfig({ ...timingMarksConfig, [side]: { ...timingMarksConfig[side], height: parseInt(e.target.value) || 0 } })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Number of Marks</label>
                  <input type="number" className="form-input" value={timingMarksConfig[side].count} onChange={(e) => setTimingMarksConfig({ ...timingMarksConfig, [side]: { ...timingMarksConfig[side], count: parseInt(e.target.value) || 0 } })} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnchorsPanel;
