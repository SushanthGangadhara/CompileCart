import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle, XCircle, Zap, Code2, GitBranch, Cpu, Layers, Settings, Play, FlaskConical, BookOpen } from 'lucide-react';
import { RuleStore, CompilerHistoryStore } from '../../../data/storage';

const PHASES = [
  { num: 1, name: 'Lexical Analysis', desc: 'Tokenizes source text into lexemes', to: '/admin/compiler/lexer', icon: <Code2 size={20} />, color: '#818cf8', impl: true },
  { num: 2, name: 'Syntax Analysis', desc: 'Recursive-descent parser, parse tree', to: '/admin/compiler/parser', icon: <GitBranch size={20} />, color: '#34d399', impl: true },
  { num: 3, name: 'Semantic Analysis', desc: 'Type checking, scope, value ranges', to: '/admin/compiler/semantic', icon: <Cpu size={20} />, color: '#fbbf24', impl: true },
  { num: 4, name: 'AST', desc: 'Abstract Syntax Tree visualization', to: '/admin/compiler/ast', icon: <Code2 size={20} />, color: '#f472b6', impl: true },
  { num: 5, name: 'Intermediate Code', desc: 'Three-address code (TAC) generation', to: '/admin/compiler/tac', icon: <Layers size={20} />, color: '#fb923c', impl: true },
  { num: 6, name: 'Optimization', desc: 'Constant folding, propagation, dead code elimination', to: '/admin/compiler/optimizer', icon: <Settings size={20} />, color: '#a78bfa', impl: true },
  { num: 7, name: 'Code Generation', desc: 'JavaScript target code from AST', to: '/admin/compiler/codegen', icon: <Play size={20} />, color: '#34d399', impl: true },
  { num: 8, name: 'Safe Execution', desc: 'AST interpreter (no eval/Function)', to: '/admin/compiler/tester', icon: <FlaskConical size={20} />, color: '#f59e0b', impl: true },
];

export default function CompilerDashboard() {
  const rules = RuleStore.getAll();
  const history = CompilerHistoryStore.getAll();
  const activeRules = rules.filter(r => r.active && r.compiled).length;
  const successCount = history.filter(h => h.success).length;
  const failCount = history.filter(h => !h.success).length;
  const optimizations = history.reduce((s, h) => s + (h.transformations || 0), 0);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1><Zap size={22} color="#818cf8" /> Compiler Dashboard</h1>
          <p>Business Rule Engine — all 8 compiler phases implemented</p>
        </div>
        <Link to="/admin/compiler/editor" className="btn btn-primary"><Code2 size={15} /> Open Editor</Link>
      </div>

      {/* Live stats */}
      <div className="cd-stats">
        <div className="cd-stat"><CheckCircle size={18} color="#34d399" /><div><span>{successCount}</span><p>Successful Compilations</p></div></div>
        <div className="cd-stat"><XCircle size={18} color="#f87171" /><div><span>{failCount}</span><p>Failed Compilations</p></div></div>
        <div className="cd-stat"><Zap size={18} color="#818cf8" /><div><span>{activeRules}</span><p>Active Rules</p></div></div>
        <div className="cd-stat"><BarChart3 size={18} color="#fbbf24" /><div><span>{optimizations}</span><p>Optimizations Applied</p></div></div>
      </div>

      {/* Pipeline visualization */}
      <div className="pv-card">
        <div className="pv-card-header">Compiler Pipeline</div>
        <div className="pipeline">
          {PHASES.map((ph, i) => (
            <React.Fragment key={ph.num}>
              <Link to={ph.to} className="pipeline-phase">
                <div className="phase-icon" style={{ background: ph.color + '22', color: ph.color }}>{ph.icon}</div>
                <div>
                  <p className="phase-num">Phase {ph.num}</p>
                  <p className="phase-name">{ph.name}</p>
                  <p className="phase-desc">{ph.desc}</p>
                </div>
                <span className="impl-badge">✓ Implemented</span>
              </Link>
              {i < PHASES.length - 1 && <div className="pipeline-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="cd-quicklinks">
        <Link to="/admin/compiler/editor" className="ql-card"><Code2 size={18} /> Rule Editor</Link>
        <Link to="/admin/compiler/saved" className="ql-card"><BookOpen size={18} /> Saved Rules</Link>
        <Link to="/admin/compiler/tester" className="ql-card"><FlaskConical size={18} /> Rule Tester</Link>
        <Link to="/admin/compiler/history" className="ql-card"><BarChart3 size={18} /> History</Link>
        <Link to="/admin/compiler/concepts" className="ql-card"><BookOpen size={18} /> Concepts</Link>
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.5rem; display: flex; align-items: center; gap: .5rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .cd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        @media(max-width:768px) { .cd-stats { grid-template-columns: repeat(2, 1fr); } }
        .cd-stat { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: .875rem; }
        .cd-stat div span { display: block; font-size: 1.75rem; font-weight: 800; color: #f1f5f9; line-height: 1; }
        .cd-stat div p { font-size: .75rem; color: #64748b; margin-top: .2rem; }
        .pv-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; margin-bottom: 1.5rem; }
        .pv-card-header { padding: .875rem 1.25rem; border-bottom: 1px solid #334155; font-weight: 700; color: #f1f5f9; font-size: .9rem; }
        .pipeline { padding: 1.25rem; display: flex; align-items: center; overflow-x: auto; gap: .25rem; }
        .pipeline-phase { display: flex; align-items: center; gap: .75rem; padding: .875rem 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 12px; text-decoration: none; min-width: 190px; transition: all .2s; flex-shrink: 0; position: relative; }
        .pipeline-phase:hover { border-color: #818cf8; background: rgba(129,140,248,.05); }
        .phase-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .phase-num { font-size: .7rem; font-weight: 700; color: #475569; text-transform: uppercase; }
        .phase-name { font-size: .85rem; font-weight: 700; color: #f1f5f9; }
        .phase-desc { font-size: .72rem; color: #64748b; margin-top: .15rem; }
        .impl-badge { position: absolute; top: .4rem; right: .5rem; font-size: .62rem; font-weight: 700; color: #34d399; background: rgba(52,211,153,.1); padding: .1rem .35rem; border-radius: 4px; }
        .pipeline-arrow { color: #334155; font-size: 1.25rem; padding: 0 .1rem; flex-shrink: 0; }
        .cd-quicklinks { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
        @media(max-width:768px) { .cd-quicklinks { grid-template-columns: repeat(2, 1fr); } }
        .ql-card { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 1.25rem; background: #1e293b; border: 1px solid #334155; border-radius: 12px; color: #94a3b8; font-size: .85rem; font-weight: 600; text-decoration: none; text-align: center; transition: all .2s; }
        .ql-card:hover { border-color: #818cf8; color: #818cf8; background: rgba(129,140,248,.06); }
      `}</style>
    </div>
  );
}
