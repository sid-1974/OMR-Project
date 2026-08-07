import React from 'react';
import { Plus, CheckCircle, Copy, Trash } from 'lucide-react';
import SearchableDropdown from '../SearchableDropdown';

const RegNoPanel = ({ regNoBlocks, setRegNoBlocks, activeRegBlockId, setActiveRegBlockId, activeRegBlock }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="checkbox" id="reg-enabled" checked={regNoBlocks.some(b => b.enabled)} onChange={(e) => setRegNoBlocks(prev => prev.map(b => ({ ...b, enabled: e.target.checked })))} />
        <label htmlFor="reg-enabled" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable Registration Grid</label>
      </div>
      {regNoBlocks.some(b => b.enabled) && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {regNoBlocks.map(block => (
              <button
                key={block.id}
                className={`btn ${Number(activeRegBlockId) === Number(block.id) ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => setActiveRegBlockId(block.id)}
              >
                Block {block.id}
              </button>
            ))}
            <button
              className="btn btn-outline"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => {
                const newId = Math.max(0, ...regNoBlocks.map(b => b.id)) + 1;
                setRegNoBlocks([...regNoBlocks, { ...activeRegBlock, id: newId, x: activeRegBlock.x + 50 }]);
                setActiveRegBlockId(newId);
              }}
            >
              <Plus size={14} /> Add Block
            </button>
          </div>
          
          {/* Active Block Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={14} className="text-primary" /> Edit Block {activeRegBlock.id}
            </h4>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.25rem' }} title="Duplicate Block" onClick={() => {
                const newId = Math.max(0, ...regNoBlocks.map(b => b.id)) + 1;
                setRegNoBlocks([...regNoBlocks, { ...activeRegBlock, id: newId, x: activeRegBlock.x + 50 }]);
                setActiveRegBlockId(newId);
              }}>
                <Copy size={14} />
              </button>
              <button className="btn btn-danger" style={{ padding: '0.25rem' }} title="Delete Block" onClick={() => {
                if (regNoBlocks.length <= 1) return;
                const newBlocks = regNoBlocks.filter(b => b.id !== activeRegBlock.id);
                setRegNoBlocks(newBlocks);
                setActiveRegBlockId(newBlocks[0].id);
              }}>
                <Trash size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Registration Type</label>
              <SearchableDropdown
                options={[
                  { label: "Numeric Only", value: "numeric" },
                  { label: "Alphanumeric", value: "alphanumeric" }
                ]}
                value={activeRegBlock.type || 'numeric'}
                onChange={(val) => {
                  const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, type: val, columnTypes: val === 'alphanumeric' ? Array(b.columns).fill('numeric') : [] } : b);
                  setRegNoBlocks(newBlocks);
                }}
              />
            </div>
            {activeRegBlock.type === 'alphanumeric' && (
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Column Configuration</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {Array.from({ length: activeRegBlock.columns }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Col {i + 1}</span>
                      <select 
                        value={activeRegBlock.columnTypes?.[i] || 'numeric'} 
                        className="form-input"
                        style={{ padding: '2px 4px', fontSize: '0.75rem' }}
                        onChange={(e) => {
                          const newTypes = [...(activeRegBlock.columnTypes || Array(activeRegBlock.columns).fill('numeric'))];
                          newTypes[i] = e.target.value;
                          const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, columnTypes: newTypes } : b);
                          setRegNoBlocks(newBlocks);
                        }}
                      >
                        <option value="numeric">Num</option>
                        <option value="alpha">Alpha</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Grid X</label>
              <input type="number" className="form-input" value={activeRegBlock.x} onChange={(e) => {
                const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, x: parseInt(e.target.value) || 0 } : b);
                setRegNoBlocks(newBlocks);
              }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Grid Y</label>
              <input type="number" className="form-input" value={activeRegBlock.y} onChange={(e) => {
                const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, y: parseInt(e.target.value) || 0 } : b);
                setRegNoBlocks(newBlocks);
              }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Width</label>
              <input type="number" className="form-input" value={activeRegBlock.width} onChange={(e) => {
                const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, width: parseInt(e.target.value) || 0 } : b);
                setRegNoBlocks(newBlocks);
              }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Height</label>
              <input type="number" className="form-input" value={activeRegBlock.height} onChange={(e) => {
                const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, height: parseInt(e.target.value) || 0 } : b);
                setRegNoBlocks(newBlocks);
              }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Digits (Cols)</label>
              <input type="number" className="form-input" value={activeRegBlock.columns} onChange={(e) => {
                const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, columns: parseInt(e.target.value) || 1 } : b);
                setRegNoBlocks(newBlocks);
              }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Radius</label>
              <input type="number" className="form-input" value={activeRegBlock.bubbleRadius} onChange={(e) => {
                const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, bubbleRadius: parseInt(e.target.value) || 1 } : b);
                setRegNoBlocks(newBlocks);
              }} />
            </div>
            {activeRegBlock.rows === 10 && (
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Digit Sequence</label>
                <SearchableDropdown
                  options={[
                    { label: "0 to 9 (0, 1, 2... 9)", value: "0-9" },
                    { label: "1 to 0 (1, 2, 3... 0)", value: "1-0" }
                  ]}
                  value={activeRegBlock.sequence || '0-9'}
                  onChange={(val) => {
                    const newBlocks = regNoBlocks.map(b => b.id === activeRegBlockId ? { ...b, sequence: val } : b);
                    setRegNoBlocks(newBlocks);
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RegNoPanel;
