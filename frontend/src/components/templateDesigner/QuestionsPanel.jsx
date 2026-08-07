import React, { useState } from 'react';
import { Copy, Plus } from 'lucide-react';

const QuestionsPanel = ({ 
  questionBlocks, setQuestionBlocks, 
  activeQBlockId, setActiveQBlockId, activeQBlock,
  canvasRef 
}) => {

  const [genTotalQ, setGenTotalQ] = useState(100);
  const [genRowsPerBlock, setGenRowsPerBlock] = useState(20);
  const [genColsPerBlock, setGenColsPerBlock] = useState(1);
  const [genOptions, setGenOptions] = useState('A,B,C,D');
  const [genStartQ, setGenStartQ] = useState(1);

  const handleGenerateBlocks = () => {
    const totalQVal = parseInt(genTotalQ) || 0;
    const rowsPerBlockVal = parseInt(genRowsPerBlock) || 0;
    const colsPerBlockVal = parseInt(genColsPerBlock) || 1;
    const startQVal = parseInt(genStartQ) || 1;

    if (totalQVal <= 0 || rowsPerBlockVal <= 0) {
      alert('Total Questions and Rows per Block must be greater than 0.');
      return;
    }

    const optionsArr = genOptions.split(',').map(o => o.trim()).filter(Boolean);
    if (optionsArr.length === 0) {
      alert('Please specify at least one option (e.g. A,B,C,D).');
      return;
    }

    const qPerBlock = rowsPerBlockVal * colsPerBlockVal;
    const numBlocks = Math.ceil(totalQVal / qPerBlock);

    const blocks = [];
    for (let i = 0; i < numBlocks; i++) {
      const blockStartQ = startQVal + i * qPerBlock;
      const blockQCount = Math.min(qPerBlock, totalQVal - (i * qPerBlock));

      blocks.push({
        id: i + 1,
        name: `Questions ${blockStartQ}-${blockStartQ + blockQCount - 1}`,
        x: 100 + (i % 2) * 150,
        y: 450 + Math.floor(i / 2) * 120,
        width: Math.min(600, colsPerBlockVal * 150 + 50),
        height: Math.min(600, rowsPerBlockVal * 20 + 20),
        startQ: blockStartQ,
        qCount: blockQCount,
        columnsCount: colsPerBlockVal,
        options: optionsArr,
        bubbleRadius: 8
      });
    }

    setQuestionBlocks(blocks);
    if (blocks.length > 0) {
      setActiveQBlockId(blocks[0].id);
    }
  };

  const handleAddQuestionBlock = () => {
    const nextId = questionBlocks.length > 0 ? Math.max(...questionBlocks.map(b => b.id)) + 1 : 1;
    const lastBlock = questionBlocks[questionBlocks.length - 1];
    const startQ = lastBlock ? parseInt(lastBlock.startQ, 10) + parseInt(lastBlock.qCount, 10) : 1;

    const newBlock = {
      id: nextId,
      name: `Questions ${startQ}-${startQ + 29}`,
      x: 100,
      y: lastBlock ? Math.min(950, lastBlock.y + 100) : 500,
      width: 600,
      height: 200,
      startQ: startQ,
      qCount: 30,
      columnsCount: 3,
      options: ['A', 'B', 'C', 'D'],
      bubbleRadius: 8
    };

    setQuestionBlocks([...questionBlocks, newBlock]);
    setActiveQBlockId(nextId);
  };

  const handleCopyQuestionBlock = () => {
    if (!activeQBlock) return;

    const nextId = questionBlocks.length > 0 ? Math.max(...questionBlocks.map(b => Number(b.id))) + 1 : 1;

    let nextStartQ = 1;
    if (questionBlocks.length > 0) {
      const highestQBlock = questionBlocks.reduce((max, b) => {
        const bEnd = parseInt(b.startQ) + parseInt(b.qCount);
        const maxEnd = parseInt(max.startQ) + parseInt(max.qCount);
        return bEnd > maxEnd ? b : max;
      }, questionBlocks[0]);
      nextStartQ = parseInt(highestQBlock.startQ) + parseInt(highestQBlock.qCount);
    }

    const newBlock = {
      ...activeQBlock,
      id: nextId,
      name: `Questions ${nextStartQ}-${nextStartQ + parseInt(activeQBlock.qCount) - 1}`,
      x: Math.min(canvasRef.current ? canvasRef.current.width - activeQBlock.width : 500, activeQBlock.x + 30),
      y: Math.min(canvasRef.current ? canvasRef.current.height - activeQBlock.height : 800, activeQBlock.y + 30),
      startQ: nextStartQ
    };

    setQuestionBlocks([...questionBlocks, newBlock]);
    setActiveQBlockId(nextId);
  };

  const handleRemoveQuestionBlock = (id) => {
    setQuestionBlocks(questionBlocks.filter(b => Number(b.id) !== Number(id)));
    if (Number(activeQBlockId) === Number(id) && questionBlocks.length > 1) {
      setActiveQBlockId(questionBlocks.filter(b => Number(b.id) !== Number(id))[0].id);
    }
  };

  const updateQBlockById = (id, field, val) => {
    setQuestionBlocks(questionBlocks.map(b => {
      if (Number(b.id) === Number(id)) {
        const updated = { ...b, [field]: val };
        if (field === 'startQ' || field === 'qCount') {
          const sQ = parseInt(field === 'startQ' ? val : b.startQ, 10) || 1;
          const qC = parseInt(field === 'qCount' ? val : b.qCount, 10) || 0;
          updated.name = `Questions ${sQ}-${sQ + qC - 1}`;
        }
        return updated;
      }
      return b;
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Bulk Auto-Generator section */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>Auto-Generate Blocks</label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Total Qns</label>
            <input type="number" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={genTotalQ} onChange={(e) => setGenTotalQ(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Qn#</label>
            <input type="number" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={genStartQ} onChange={(e) => setGenStartQ(parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Rows per Block</label>
            <input type="number" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={genRowsPerBlock} onChange={(e) => setGenRowsPerBlock(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Cols per Block</label>
            <input type="number" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={genColsPerBlock} onChange={(e) => setGenColsPerBlock(parseInt(e.target.value) || 1)} />
          </div>
        </div>
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Option Bubbles (comma-separated)</label>
          <input type="text" className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem' }} value={genOptions} onChange={(e) => setGenOptions(e.target.value)} placeholder="A,B,C,D" />
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px', marginTop: '0.25rem' }}
          onClick={handleGenerateBlocks}
        >
          Generate Blocks
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Question Blocks</label>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
            onClick={handleCopyQuestionBlock}
            disabled={!activeQBlock}
          >
            <Copy size={12} /> Copy Active
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
            onClick={handleAddQuestionBlock}
          >
            <Plus size={12} /> Add New
          </button>
        </div>
      </div>

      {/* List of all blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
        {questionBlocks.length === 0 ? (
          <div style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            border: '2px dashed var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
          }}>
            No question blocks created yet. Click "Add New" or use "Auto-Generate Blocks" to create one.
          </div>
        ) : (
          questionBlocks.map((block, idx) => {
            const isActive = Number(block.id) === Number(activeQBlockId);
            return (
              <div
                key={block.id}
                onClick={() => setActiveQBlockId(block.id)}
                style={{
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  background: isActive ? 'rgba(99, 102, 241, 0.03)' : 'rgba(255,255,255,0.01)',
                  transition: 'var(--transition)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)' }}>
                    Block #{idx + 1}: Q{block.startQ}-Q{parseInt(block.startQ) + parseInt(block.qCount) - 1}
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveQuestionBlock(block.id);
                    }}
                  >
                    Delete
                  </button>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Block Name</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    value={block.name}
                    onChange={(e) => updateQBlockById(block.id, 'name', e.target.value)}
                    onFocus={() => setActiveQBlockId(block.id)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.4rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>X</label>
                    <input type="number" className="form-input" style={{ padding: '4px', fontSize: '0.75rem', textAlign: 'center' }} value={block.x} onChange={(e) => updateQBlockById(block.id, 'x', parseInt(e.target.value) || 0)} onFocus={() => setActiveQBlockId(block.id)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Y</label>
                    <input type="number" className="form-input" style={{ padding: '4px', fontSize: '0.75rem', textAlign: 'center' }} value={block.y} onChange={(e) => updateQBlockById(block.id, 'y', parseInt(e.target.value) || 0)} onFocus={() => setActiveQBlockId(block.id)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>W</label>
                    <input type="number" className="form-input" style={{ padding: '4px', fontSize: '0.75rem', textAlign: 'center' }} value={block.width} onChange={(e) => updateQBlockById(block.id, 'width', parseInt(e.target.value) || 0)} onFocus={() => setActiveQBlockId(block.id)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>H</label>
                    <input type="number" className="form-input" style={{ padding: '4px', fontSize: '0.75rem', textAlign: 'center' }} value={block.height} onChange={(e) => updateQBlockById(block.id, 'height', parseInt(e.target.value) || 0)} onFocus={() => setActiveQBlockId(block.id)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.4rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Start Qn#</label>
                    <input type="number" className="form-input" style={{ padding: '4px', fontSize: '0.75rem', textAlign: 'center' }} value={block.startQ} onChange={(e) => updateQBlockById(block.id, 'startQ', parseInt(e.target.value) || 1)} onFocus={() => setActiveQBlockId(block.id)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Total Qns</label>
                    <input type="number" className="form-input" style={{ padding: '4px', fontSize: '0.75rem', textAlign: 'center' }} value={block.qCount} onChange={(e) => updateQBlockById(block.id, 'qCount', parseInt(e.target.value) || 1)} onFocus={() => setActiveQBlockId(block.id)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Cols</label>
                    <input type="number" className="form-input" style={{ padding: '4px', fontSize: '0.75rem', textAlign: 'center' }} value={block.columnsCount} onChange={(e) => updateQBlockById(block.id, 'columnsCount', parseInt(e.target.value) || 1)} onFocus={() => setActiveQBlockId(block.id)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.15rem' }}>Radius</label>
                    <input type="number" step="0.1" className="form-input" style={{ padding: '4px', fontSize: '0.75rem', textAlign: 'center' }} value={block.bubbleRadius} onChange={(e) => updateQBlockById(block.id, 'bubbleRadius', parseFloat(e.target.value) || 1)} onFocus={() => setActiveQBlockId(block.id)} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default QuestionsPanel;
