import React from 'react';
import { Plus, Code, Copy, Trash2 } from 'lucide-react';

const TemplatesList = ({
  loading,
  allTemplates,
  parents,
  handleSelectTemplate,
  handleEditTemplate,
  handleCopyTemplate,
  handleDeleteTemplate,
  setViewMode
}) => {
  return (
    <div className="glass-card" style={{ padding: '2rem', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Templates List</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your existing OMR template designs or create a new one.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            handleSelectTemplate(null);
            setViewMode('designer');
          }}
        >
          <Plus size={18} />
          Create New Template
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading templates...</div>
      ) : allTemplates.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>No templates found. Create your first template to get started.</p>
          <button className="btn btn-primary" onClick={() => { handleSelectTemplate(null); setViewMode('designer'); }}>
            <Plus size={18} /> Create Template
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Template Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Group (Parent)</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Type / QPCode</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allTemplates.map(t => {
                const parent = parents.find(p => p.id === t.template_id);
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{t.name}</td>
                    <td style={{ padding: '1rem' }}>{parent ? parent.name : 'Unknown Group'}</td>
                    <td style={{ padding: '1rem' }}>
                      {t.qpcode ? (
                        <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>QPCode: {t.qpcode}</span>
                      ) : (
                        <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-secondary)', borderRadius: '4px', fontSize: '0.85rem' }}>Normal Template</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Edit" onClick={() => handleEditTemplate(t)}>
                          <Code size={16} /> Edit
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Copy" onClick={() => handleCopyTemplate(t)}>
                          <Copy size={16} /> Copy
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem', color: 'var(--error)' }} title="Delete" onClick={() => handleDeleteTemplate(t.id)}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TemplatesList;
