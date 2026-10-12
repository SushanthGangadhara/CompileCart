import React, { useState } from 'react';
import { Play, CheckCircle, XCircle } from 'lucide-react';
import { useCompiler } from './CompilerWorkbench';
import { executeRule } from '../../../compiler/executor';
import { formatCurrency } from '../../../data/storage';

const DEFAULT_CTX = {
  cart_total: 6000,
  quantity: 3,
  category: 'Electronics',
  customer_type: 'premium',
  coupon: '',
  stock: 15,
};

export default function RuleTester() {
  const { result, source, runCompile } = useCompiler();
  const [ctx, setCtx] = useState({ ...DEFAULT_CTX });
  const [testResult, setTestResult] = useState(null);

  function handleTest() {
    const r = result || runCompile(source);
    if (!r?.success || !r.ast) { setTestResult({ error: 'Rule must compile successfully before testing.' }); return; }
    const execResult = executeRule(r.ast, { ...ctx });
    setTestResult(execResult);
  }

  function updateCtx(key, value) {
    const numKeys = ['cart_total', 'quantity', 'stock'];
    setCtx(c => ({ ...c, [key]: numKeys.includes(key) ? parseFloat(value) || 0 : value }));
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Rule Tester</h1>
          <p>Test the compiled rule against a custom cart context</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Context inputs */}
        <div className="pv-card">
          <div className="pv-card-header">Cart Context</div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
            {Object.entries(ctx).map(([key, val]) => (
              <div key={key} className="form-group">
                <label className="form-label" style={{ color: '#94a3b8', fontSize: '.8rem' }}>{key}</label>
                <input
                  className="form-control dark-input"
                  value={val}
                  onChange={e => updateCtx(key, e.target.value)}
                  type={['cart_total','quantity','stock'].includes(key) ? 'number' : 'text'}
                />
              </div>
            ))}
            <button className="btn btn-primary" onClick={handleTest}><Play size={16} /> Execute Rule</button>
          </div>
        </div>

        {/* Result */}
        <div className="pv-card">
          <div className="pv-card-header">Execution Result</div>
          <div style={{ padding: '1.25rem' }}>
            {!testResult ? (
              <p style={{ color: '#475569', fontSize: '.875rem' }}>Click "Execute Rule" to test the rule against the context on the left.</p>
            ) : testResult.error ? (
              <div className="error-block">{testResult.error}</div>
            ) : (
              <div>
                <div className={`result-badge ${testResult.conditionMet ? 'met' : 'not-met'}`}>
                  {testResult.conditionMet ? <><CheckCircle size={20} /> Condition MET</> : <><XCircle size={20} /> Condition NOT MET</>}
                </div>

                {testResult.conditionMet && testResult.action && (
                  <div className="action-result">
                    <p className="action-title">Action Applied</p>
                    <div className="action-detail">
                      <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{testResult.action.target}</span>
                      <span style={{ color: '#475569' }}>=</span>
                      <span style={{ color: '#34d399', fontWeight: 700, fontSize: '1.25rem' }}>
                        {testResult.action.target === 'discount' ? `${testResult.action.value}%` :
                         testResult.action.target === 'shipping' ? formatCurrency(testResult.action.value) :
                         testResult.action.value}
                      </span>
                    </div>
                  </div>
                )}

                <div className="ctx-result">
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.5rem' }}>Final Context</p>
                  {Object.entries(testResult.context).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', padding: '.25rem .5rem', borderBottom: '1px solid #1e293b', fontFamily: 'monospace' }}>
                      <span style={{ color: '#34d399' }}>{k}</span>
                      <span style={{ color: '#fb923c' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current rule */}
      <div className="pv-card">
        <div className="pv-card-header">Current Rule (Source)</div>
        <pre className="code-block" style={{ margin: '.75rem' }}>{source}</pre>
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { margin-bottom: 1.5rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.4rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .pv-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; margin-bottom: 1rem; }
        .pv-card-header { padding: .875rem 1.25rem; border-bottom: 1px solid #334155; font-weight: 700; color: #f1f5f9; font-size: .9rem; }
        .code-block { background: #0f172a; color: #e2e8f0; padding: 1.25rem; font-family: monospace; font-size: .85rem; line-height: 1.7; overflow-x: auto; white-space: pre; }
        .error-block { padding: .75rem; background: rgba(239,68,68,.08); border-left: 3px solid #ef4444; color: #fca5a5; font-family: monospace; font-size: .85rem; border-radius: 6px; }
        .dark-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        .form-label { color: #94a3b8 !important; }
        .result-badge { display: flex; align-items: center; gap: .75rem; padding: 1rem; border-radius: 12px; font-size: 1rem; font-weight: 700; margin-bottom: 1.25rem; }
        .result-badge.met { background: rgba(52,211,153,.12); color: #34d399; border: 1px solid rgba(52,211,153,.3); }
        .result-badge.not-met { background: rgba(239,68,68,.1); color: #f87171; border: 1px solid rgba(239,68,68,.25); }
        .action-result { background: rgba(129,140,248,.08); border: 1px solid rgba(129,140,248,.2); border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
        .action-title { font-size: .75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .5rem; }
        .action-detail { display: flex; align-items: center; gap: .75rem; }
        .ctx-result { background: #0f172a; border-radius: 8px; overflow: hidden; }
      `}</style>
    </div>
  );
}
