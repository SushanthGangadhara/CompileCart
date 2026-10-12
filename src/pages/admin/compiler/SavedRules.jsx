import React, { useState } from 'react';
import { Zap, Trash2, Play, Power, PowerOff, History } from 'lucide-react';
import { RuleStore, CompilerHistoryStore, formatDateTime } from '../../../data/storage';
import { useCompiler } from './CompilerWorkbench';
import { useNavigate } from 'react-router-dom';

export function SavedRulesView() {
  const [rules, setRules] = useState(RuleStore.getAll());
  const { setSource, runCompile } = useCompiler();
  const navigate = useNavigate();

  function reload() { setRules(RuleStore.getAll()); }

  function toggleActive(id) {
    const rule = RuleStore.findById(id);
    if (!rule?.compiled) return;
    RuleStore.update({ ...rule, active: !rule.active });
    reload();
  }

  function deleteRule(id) {
    if (!window.confirm('Delete this rule?')) return;
    RuleStore.delete(id);
    reload();
  }

  function openInEditor(rule) {
    setSource(rule.source);
    runCompile(rule.source);
    navigate('/admin/compiler/editor');
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Saved Rules</h1>
          <p>{rules.length} rules saved · {rules.filter(r => r.active).length} active</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {rules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
            <Zap size={40} style={{ margin: '0 auto .75rem', display: 'block' }} />
            <p>No rules saved yet. Go to the Rule Editor to compile and save rules.</p>
          </div>
        ) : rules.map(rule => (
          <div key={rule.id} className="rule-card">
            <div className="rule-card-header">
              <div>
                <h3 className="rule-name">{rule.name}</h3>
                <p className="rule-desc">{rule.description}</p>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', flexShrink: 0 }}>
                {rule.compiled && (
                  <span className={`rule-status ${rule.active ? 'active' : 'inactive'}`}>
                    {rule.active ? '● ACTIVE' : '○ INACTIVE'}
                  </span>
                )}
                {!rule.compiled && <span className="rule-status draft">DRAFT</span>}
              </div>
            </div>
            <pre className="rule-source">{rule.source}</pre>
            {rule.action && (
              <div className="rule-action-tag">
                ⚡ Action: <strong>{rule.action.type}</strong> = <strong>{rule.action.value}</strong>
                {rule.action.type === 'discount' ? '%' : rule.action.type === 'shipping' ? ' ₹' : ''}
              </div>
            )}
            <div className="rule-meta">
              <span>Created: {formatDateTime(rule.createdAt)}</span>
              {rule.compiledAt && <span>Compiled: {formatDateTime(rule.compiledAt)}</span>}
            </div>
            <div className="rule-actions">
              <button className="rule-btn open" onClick={() => openInEditor(rule)}>
                <Play size={13} /> Open in Editor
              </button>
              {rule.compiled && (
                <button className={`rule-btn ${rule.active ? 'deactivate' : 'activate'}`} onClick={() => toggleActive(rule.id)}>
                  {rule.active ? <><PowerOff size={13} /> Deactivate</> : <><Power size={13} /> Activate</>}
                </button>
              )}
              <button className="rule-btn delete" onClick={() => deleteRule(rule.id)}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { margin-bottom: 1.5rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.4rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .rule-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
        .rule-card-header { display: flex; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #334155; }
        .rule-name { color: #f1f5f9; font-size: 1rem; }
        .rule-desc { color: #64748b; font-size: .8rem; margin-top: .2rem; }
        .rule-status { padding: .25rem .65rem; border-radius: 100px; font-size: .72rem; font-weight: 700; letter-spacing: .04em; }
        .rule-status.active { background: rgba(16,185,129,.15); color: #34d399; }
        .rule-status.inactive { background: rgba(100,116,139,.15); color: #64748b; }
        .rule-status.draft { background: rgba(245,158,11,.15); color: #fbbf24; }
        .rule-source { font-family: monospace; font-size: .82rem; color: #94a3b8; background: #0f172a; padding: .875rem 1.25rem; border-bottom: 1px solid #334155; white-space: pre; overflow-x: auto; }
        .rule-action-tag { padding: .5rem 1.25rem; background: rgba(129,140,248,.06); font-size: .8rem; color: #818cf8; border-bottom: 1px solid #334155; }
        .rule-meta { padding: .5rem 1.25rem; display: flex; gap: 2rem; font-size: .75rem; color: #475569; border-bottom: 1px solid #1e293b; }
        .rule-actions { padding: .75rem 1.25rem; display: flex; gap: .5rem; }
        .rule-btn { display: flex; align-items: center; gap: .35rem; padding: .35rem .75rem; border-radius: 6px; font-size: .8rem; font-weight: 600; cursor: pointer; border: none; transition: all .15s; }
        .rule-btn.open { background: rgba(99,102,241,.1); color: #818cf8; }
        .rule-btn.open:hover { background: rgba(99,102,241,.2); }
        .rule-btn.activate { background: rgba(16,185,129,.1); color: #34d399; }
        .rule-btn.activate:hover { background: rgba(16,185,129,.2); }
        .rule-btn.deactivate { background: rgba(245,158,11,.1); color: #fbbf24; }
        .rule-btn.deactivate:hover { background: rgba(245,158,11,.2); }
        .rule-btn.delete { background: rgba(239,68,68,.1); color: #f87171; }
        .rule-btn.delete:hover { background: rgba(239,68,68,.2); }
      `}</style>
    </div>
  );
}

export function CompilerHistoryView() {
  const history = CompilerHistoryStore.getAll();
  const { setSource, runCompile } = useCompiler();
  const navigate = useNavigate();

  function openInEditor(entry) {
    setSource(entry.source);
    runCompile(entry.source);
    navigate('/admin/compiler/editor');
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1><History size={20} /> Compilation History</h1>
          <p>{history.length} compilation attempts</p>
        </div>
        {history.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={() => { CompilerHistoryStore.clear(); window.location.reload(); }}>
            Clear History
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {history.length === 0 ? (
          <p style={{ color: '#475569', textAlign: 'center', padding: '2rem' }}>No compilation history yet.</p>
        ) : history.map(entry => (
          <div key={entry.id} className="history-card">
            <div className="history-header">
              <span className={`hist-status ${entry.success ? 'ok' : 'fail'}`}>
                {entry.success ? '✓ SUCCESS' : '✗ FAILED'}
              </span>
              <span className="hist-time">{formatDateTime(entry.timestamp)}</span>
              <button className="rule-btn open" style={{ fontSize: '.75rem', padding: '.25rem .6rem' }} onClick={() => openInEditor(entry)}>
                Reopen
              </button>
            </div>
            <pre className="hist-source">{entry.source}</pre>
            <div className="hist-stats">
              <span>Tokens: {entry.tokenCount}</span>
              <span>TAC: {entry.tacCount}</span>
              <span>Optimized: {entry.optimizedCount}</span>
              <span>Transforms: {entry.transformations}</span>
            </div>
            {entry.errors.length > 0 && (
              <div className="hist-errors">
                {entry.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.4rem; display: flex; align-items: center; gap: .5rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .history-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
        .history-header { display: flex; align-items: center; gap: 1rem; padding: .625rem 1rem; border-bottom: 1px solid #334155; }
        .hist-status { font-size: .75rem; font-weight: 700; padding: .2rem .55rem; border-radius: 4px; }
        .hist-status.ok { background: rgba(52,211,153,.15); color: #34d399; }
        .hist-status.fail { background: rgba(248,113,113,.15); color: #f87171; }
        .hist-time { color: #475569; font-size: .78rem; margin-left: auto; }
        .hist-source { font-family: monospace; font-size: .78rem; color: #64748b; background: #0f172a; padding: .625rem 1rem; border-bottom: 1px solid #334155; white-space: pre; overflow-x: auto; max-height: 80px; }
        .hist-stats { display: flex; gap: 1.5rem; padding: .5rem 1rem; font-size: .78rem; color: #475569; }
        .hist-errors { padding: .5rem 1rem; background: rgba(239,68,68,.05); }
        .hist-errors div { font-family: monospace; font-size: .75rem; color: #f87171; padding: .15rem 0; border-bottom: 1px solid #1e293b; }
        .rule-btn { display: flex; align-items: center; gap: .35rem; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; transition: all .15s; }
        .rule-btn.open { background: rgba(99,102,241,.1); color: #818cf8; }
        .rule-btn.open:hover { background: rgba(99,102,241,.2); }
      `}</style>
    </div>
  );
}
