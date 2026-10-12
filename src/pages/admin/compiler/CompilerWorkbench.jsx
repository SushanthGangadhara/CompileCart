/**
 * CompilerWorkbench.jsx
 * 
 * The central compiler UI. Hosts the rule editor and all phase outputs.
 * All phase views share the same compileResult state via context/props.
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Save, Zap, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { compile, buildHistoryEntry } from '../../../compiler/compiler';
import { RuleStore, CompilerHistoryStore, generateId } from '../../../data/storage';
import { GRAMMAR_RULES } from '../../../compiler/parser';
import { TokenType } from '../../../compiler/lexer';
import { formatTAC } from '../../../compiler/tacGenerator';
import { formatOptimizedTAC } from '../../../compiler/optimizer';
import { astToDisplayTree, parseTreeToDisplayTree } from '../../../compiler/astVisualizer';

// ── Sample rules ──────────────────────────────────────────────────────────────
export const SAMPLE_RULES = [
  {
    name: 'Electronics Discount',
    source: 'IF cart_total > 5000 AND category = "Electronics"\nTHEN discount = 20',
  },
  {
    name: 'Bulk Purchase',
    source: 'IF quantity >= 3 AND cart_total > 2000\nTHEN discount = 15',
  },
  {
    name: 'Premium Customer',
    source: 'IF customer_type = "premium" AND cart_total > 1000\nTHEN discount = 10',
  },
  {
    name: 'Free Shipping',
    source: 'IF cart_total >= 999\nTHEN shipping = 0',
  },
  {
    name: 'Low Stock Promo',
    source: 'IF stock < 10 AND category = "Electronics"\nTHEN discount = 5',
  },
  {
    name: 'Invalid Rule (Lex Error)',
    source: 'IF cart_total > 5000 THEN discount = @20',
  },
  {
    name: 'Invalid Rule (Syntax Error)',
    source: 'IF cart_total > THEN discount = 10',
  },
  {
    name: 'Invalid Rule (Semantic Error)',
    source: 'IF cart_total > "hello"\nTHEN discount = 10',
  },
];

// ── Compiler context shared across all phase views ────────────────────────────
export const CompilerContext = React.createContext(null);

export function CompilerProvider({ children }) {
  const [source, setSource] = useState('IF cart_total > 5000 AND category = "Electronics"\nTHEN discount = 20');
  const [result, setResult] = useState(null);
  const [compiling, setCompiling] = useState(false);

  const runCompile = useCallback((src = source) => {
    setCompiling(true);
    const r = compile(src);
    setResult(r);
    setCompiling(false);
    // Log to history
    CompilerHistoryStore.add(buildHistoryEntry(src, r));
    return r;
  }, [source]);

  return (
    <CompilerContext.Provider value={{ source, setSource, result, setResult, compiling, runCompile }}>
      {children}
    </CompilerContext.Provider>
  );
}

export function useCompiler() {
  const ctx = React.useContext(CompilerContext);
  if (!ctx) throw new Error('useCompiler must be inside CompilerProvider');
  return ctx;
}

// ── Rule Editor ────────────────────────────────────────────────────────────────
export function RuleEditor() {
  const { source, setSource, result, runCompile, compiling } = useCompiler();
  const navigate = useNavigate();
  const [ruleName, setRuleName] = useState('My Rule');
  const [saveMsg, setSaveMsg] = useState('');

  function handleSaveRule() {
    if (!result?.success) { setSaveMsg('Compile successfully before saving.'); return; }
    const rule = {
      id: generateId(),
      name: ruleName,
      source,
      description: `Custom rule: ${ruleName}`,
      compiled: true,
      active: false,
      createdAt: new Date().toISOString(),
      compiledAt: new Date().toISOString(),
      action: result.ast?.action
        ? { type: result.ast.action.target, value: result.ast.action.value?.value }
        : null,
      compilationResult: { success: true, errors: [], warnings: result.warnings },
    };
    RuleStore.add(rule);
    setSaveMsg('Rule saved! Activate it from Saved Rules.');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1><Zap size={20} color="#818cf8" /> Rule Editor</h1>
          <p>Write business rules in our custom language and compile them</p>
        </div>
      </div>

      <div className="editor-layout">
        {/* Editor panel */}
        <div className="editor-panel">
          <div className="editor-toolbar">
            <span className="editor-lang-badge">RULE DSL</span>
            <div style={{ flex: 1 }} />
            {SAMPLE_RULES.slice(0, 5).map(s => (
              <button key={s.name} className="sample-btn" onClick={() => { setSource(s.source); }}>
                {s.name}
              </button>
            ))}
            <div className="sample-sep" />
            {SAMPLE_RULES.slice(5).map(s => (
              <button key={s.name} className="sample-btn error-sample" onClick={() => setSource(s.source)}>
                {s.name}
              </button>
            ))}
          </div>
          <textarea
            className="rule-editor"
            value={source}
            onChange={e => setSource(e.target.value)}
            spellCheck={false}
            rows={8}
            placeholder="Write your rule here..."
          />
          <div className="editor-footer">
            <span className="char-count">{source.length} chars · {source.split('\n').length} lines</span>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <input
                className="rule-name-input"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder="Rule name..."
              />
              <button className="btn btn-success btn-sm" onClick={handleSaveRule} disabled={!result?.success}>
                <Save size={14} /> Save Rule
              </button>
              <button className="btn btn-primary" onClick={() => runCompile(source)} disabled={compiling}>
                <Play size={16} /> {compiling ? 'Compiling…' : 'Compile'}
              </button>
            </div>
          </div>
          {saveMsg && <div className="alert alert-info" style={{ margin: '.5rem 0 0' }}>{saveMsg}</div>}
        </div>

        {/* Phase summary */}
        {result && (
          <div className="phase-summary">
            <h3>Compilation Result</h3>
            <div className="phase-list">
              {[
                { key: 'lexer', label: 'Lexical Analysis' },
                { key: 'parser', label: 'Syntax Analysis' },
                { key: 'semantic', label: 'Semantic Analysis' },
                { key: 'ast', label: 'AST' },
                { key: 'tac', label: 'Intermediate Code' },
                { key: 'optimizer', label: 'Optimization' },
                { key: 'codeGen', label: 'Code Generation' },
              ].map(ph => {
                const phase = result.phases[ph.key];
                const ok = phase?.success;
                const na = !phase;
                return (
                  <div key={ph.key} className={`phase-item ${na ? 'na' : ok ? 'ok' : 'fail'}`}>
                    {na ? <AlertCircle size={14} /> : ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <span>{ph.label}</span>
                    {phase?.errors?.length > 0 && (
                      <span className="phase-err-count">{phase.errors.length} error(s)</span>
                    )}
                  </div>
                );
              })}
            </div>

            {result.errors.length > 0 && (
              <div className="error-list">
                {result.errors.map((e, i) => <div key={i} className="error-item">{e}</div>)}
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="warning-list">
                {result.warnings.map((w, i) => <div key={i} className="warning-item">⚠️ {w}</div>)}
              </div>
            )}

            {result.success && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <button className="nav-phase-btn" onClick={() => navigate('/admin/compiler/lexer')}>View Tokens</button>
                <button className="nav-phase-btn" onClick={() => navigate('/admin/compiler/parser')}>View Parse Tree</button>
                <button className="nav-phase-btn" onClick={() => navigate('/admin/compiler/ast')}>View AST</button>
                <button className="nav-phase-btn" onClick={() => navigate('/admin/compiler/tac')}>View TAC</button>
                <button className="nav-phase-btn" onClick={() => navigate('/admin/compiler/optimizer')}>View Optimization</button>
                <button className="nav-phase-btn" onClick={() => navigate('/admin/compiler/codegen')}>View Code</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grammar reference */}
      <div className="grammar-ref">
        <h3>Grammar Reference</h3>
        <div className="grammar-table">
          {GRAMMAR_RULES.map(r => (
            <div key={r.name} className="grammar-row">
              <span className="grammar-name">{r.name}</span>
              <span className="grammar-arrow">→</span>
              <span className="grammar-prod">{r.production}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .editor-layout { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; margin-bottom: 1.5rem; }
        @media(max-width:900px) { .editor-layout { grid-template-columns: 1fr; } }
        .editor-panel { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
        .editor-toolbar { display: flex; align-items: center; gap: .35rem; padding: .625rem 1rem; border-bottom: 1px solid #334155; background: #0f172a; flex-wrap: wrap; }
        .editor-lang-badge { background: rgba(129,140,248,.15); color: #818cf8; font-size: .7rem; font-weight: 700; padding: .2rem .5rem; border-radius: 4px; letter-spacing: .05em; }
        .sample-btn { background: rgba(100,116,139,.1); border: 1px solid #334155; color: #94a3b8; font-size: .7rem; padding: .25rem .5rem; border-radius: 4px; cursor: pointer; transition: all .15s; white-space: nowrap; }
        .sample-btn:hover { background: rgba(99,102,241,.15); color: #818cf8; border-color: #818cf8; }
        .error-sample:hover { background: rgba(239,68,68,.1); color: #f87171; border-color: #f87171; }
        .sample-sep { width: 1px; height: 16px; background: #334155; flex-shrink: 0; }
        .rule-editor { width: 100%; background: #0f172a; color: #e2e8f0; font-family: 'JetBrains Mono','Fira Code','Courier New',monospace; font-size: .9rem; line-height: 1.7; padding: 1.25rem; border: none; outline: none; resize: vertical; min-height: 180px; }
        .editor-footer { display: flex; align-items: center; gap: .75rem; padding: .625rem 1rem; border-top: 1px solid #334155; background: #0f172a; flex-wrap: wrap; }
        .char-count { font-size: .75rem; color: #475569; }
        .rule-name-input { background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; font-size: .8rem; padding: .35rem .625rem; outline: none; }
        .rule-name-input:focus { border-color: #6366f1; }
        .phase-summary { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 1.25rem; }
        .phase-summary h3 { color: #f1f5f9; margin-bottom: 1rem; font-size: 1rem; }
        .phase-list { display: flex; flex-direction: column; gap: .4rem; }
        .phase-item { display: flex; align-items: center; gap: .5rem; font-size: .8rem; padding: .35rem .5rem; border-radius: 6px; }
        .phase-item.ok { color: #34d399; background: rgba(52,211,153,.08); }
        .phase-item.fail { color: #f87171; background: rgba(248,113,113,.08); }
        .phase-item.na { color: #475569; background: rgba(71,85,105,.08); }
        .phase-err-count { margin-left: auto; font-size: .7rem; background: rgba(239,68,68,.2); color: #f87171; padding: .1rem .4rem; border-radius: 4px; }
        .error-list { margin-top: .75rem; display: flex; flex-direction: column; gap: .35rem; }
        .error-item { font-size: .8rem; color: #fca5a5; background: rgba(239,68,68,.08); padding: .5rem .75rem; border-radius: 6px; border-left: 3px solid #ef4444; font-family: monospace; }
        .warning-list { margin-top: .35rem; }
        .warning-item { font-size: .8rem; color: #fcd34d; }
        .nav-phase-btn { background: rgba(129,140,248,.1); border: 1px solid rgba(129,140,248,.3); color: #818cf8; font-size: .75rem; padding: .3rem .7rem; border-radius: 6px; cursor: pointer; transition: all .15s; }
        .nav-phase-btn:hover { background: rgba(129,140,248,.2); }
        .grammar-ref { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 1.25rem; }
        .grammar-ref h3 { color: #f1f5f9; margin-bottom: 1rem; font-size: 1rem; }
        .grammar-table { display: flex; flex-direction: column; gap: .35rem; }
        .grammar-row { display: flex; align-items: baseline; gap: .75rem; font-family: monospace; font-size: .82rem; }
        .grammar-name { color: #fbbf24; min-width: 100px; font-weight: 700; }
        .grammar-arrow { color: #475569; }
        .grammar-prod { color: #94a3b8; }
      `}</style>
    </div>
  );
}
