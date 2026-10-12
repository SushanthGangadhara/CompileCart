/**
 * PhaseViews.jsx — All compiler phase UI components
 *
 * Each component reads from CompilerContext (via useCompiler)
 * and renders the new academic data exposed by the rewritten compiler.
 *
 * Views:
 *  LexerView    — tokens, DFA table, NFA descriptions, symbol table (lexer)
 *  ParserView   — FIRST/FOLLOW, LL(1) table, parse trace, PARSE TREE, AST side-by-side
 *  SemanticView — attribute grammar spec, type rules, SymbolTable dump, scope history, checks
 *  ASTView      — AST vs Parse Tree comparison, node legend
 *  TACView      — Quadruples, Triples, Indirect Triples tabs
 *  OptimizerView— CFG / basic blocks, liveness, reaching defs, CSE log, 7 passes, loop notes
 *  CodeGenView  — pseudo-assembly, register allocation graph, JS from TAC vs AST
 */
import React, { useState } from 'react';
import { Copy, Download, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useCompiler } from './CompilerWorkbench';
import { TokenType, DFA_STATES, DFA_TRANSITIONS, NFA_DESCRIPTION } from '../../../compiler/lexer';
import { GRAMMAR_RULES, FIRST_SETS, FOLLOW_SETS, LL1_TABLE } from '../../../compiler/parser';
import { ATTRIBUTE_GRAMMAR_SPEC, TYPE_RULES } from '../../../compiler/semantic';
import { astToDisplayTree, parseTreeToDisplayTree } from '../../../compiler/astVisualizer';

// ─── Shared helpers ───────────────────────────────────────────────────────────
function NoResult() {
  const { runCompile, source } = useCompiler();
  return (
    <div style={{ textAlign:'center', padding:'3rem', color:'#475569' }}>
      <AlertCircle size={40} style={{ margin:'0 auto .75rem', display:'block' }} />
      <p style={{ marginBottom:'1rem' }}>Compile a rule first to see this phase.</p>
      <button className="btn btn-primary btn-sm" onClick={() => runCompile(source)}>Compile Now</button>
    </div>
  );
}

function CopyBtn({ text }) {
  const [cp, setCp] = useState(false);
  return (
    <button className="copy-btn" onClick={() => { navigator.clipboard?.writeText(text); setCp(true); setTimeout(() => setCp(false), 2000); }}>
      <Copy size={13} /> {cp ? 'Copied!' : 'Copy'}
    </button>
  );
}

function Card({ title, children, right }) {
  return (
    <div className="pv-card" style={{ marginBottom:'1rem' }}>
      <div className="pv-card-hdr" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>{title}</span>{right}
      </div>
      {children}
    </div>
  );
}

function PhaseBadge({ ok }) {
  return ok
    ? <span className="ph-badge ok">✓ PASS</span>
    : <span className="ph-badge fail">✗ FAIL</span>;
}

function Tabs({ tabs }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="tab-bar">
        {tabs.map((t, i) => (
          <button key={i} className={`tab-btn ${active === i ? 'active' : ''}`} onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[active]?.content}</div>
    </div>
  );
}

// recursive tree renderer
function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(true);
  if (!node) return null;
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div style={{ paddingLeft: depth > 0 ? '1.5rem' : 0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.4rem', padding:'.2rem 0', cursor: hasChildren ? 'pointer' : 'default' }}
           onClick={() => hasChildren && setOpen(o => !o)}>
        {hasChildren
          ? (open ? <ChevronDown size={13} color="#475569" /> : <ChevronRight size={13} color="#475569" />)
          : <span style={{ width:13 }} />}
        <span style={{
          padding:'.15rem .5rem', borderRadius:6,
          background: (node.color || '#94a3b8') + '22',
          color: node.color || '#94a3b8',
          fontFamily:'monospace', fontSize:'.78rem', fontWeight:700,
          border:`1px solid ${(node.color||'#94a3b8')}44`,
          whiteSpace:'nowrap'
        }}>
          {node.label}
        </span>
        <span style={{ fontSize:'.65rem', color:'#475569' }}>{node.nodeType}</span>
        {node.isLeaf && <span style={{ fontSize:'.6rem', color:'#334155', background:'#1e293b', padding:'.1rem .3rem', borderRadius:4 }}>leaf</span>}
      </div>
      {open && hasChildren && node.children.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} />)}
    </div>
  );
}

// ─── TOKEN colors ─────────────────────────────────────────────────────────────
const TC = {
  [TokenType.KEYWORD]   :'#818cf8', [TokenType.IDENTIFIER]:'#34d399',
  [TokenType.OPERATOR]  :'#fbbf24', [TokenType.NUMBER]     :'#fb923c',
  [TokenType.STRING]    :'#a78bfa', [TokenType.BOOLEAN]    :'#f472b6',
  [TokenType.LPAREN]    :'#94a3b8', [TokenType.RPAREN]     :'#94a3b8',
  [TokenType.EOF]       :'#475569', [TokenType.UNKNOWN]    :'#ef4444',
  [TokenType.NEWLINE]   :'#334155',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: LEXER VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function LexerView() {
  const { result, source, runCompile } = useCompiler();
  const phase = result?.phases?.lexer;

  return (
    <div className="admin-page">
      <div className="pv-page-hdr">
        <div><h1>Phase 1 — Lexical Analysis</h1><p>DFA-based tokenizer with NFA description and symbol table population</p></div>
        {phase && <PhaseBadge ok={phase.success} />}
      </div>
      {!phase ? <NoResult /> : (
        <Tabs tabs={[
          { label: 'Token Stream',    content: <TokenStreamTab phase={phase} source={source} /> },
          { label: 'Token Table',     content: <TokenTableTab phase={phase} /> },
          { label: 'DFA Table',       content: <DFATableTab /> },
          { label: 'NFA Description', content: <NFATab /> },
          { label: 'Symbol Table',    content: <LexerSymTableTab phase={phase} /> },
          { label: 'Errors',          content: <ErrorsTab errors={phase.errors} /> },
        ]} />
      )}
      <PhaseStyles />
    </div>
  );
}

function TokenStreamTab({ phase, source }) {
  return (
    <div className="pv-pad">
      <Card title="Source Rule">
        <pre className="code-block">{source}</pre>
      </Card>
      <Card title="Token Stream (colour-coded by type)">
        <div style={{ display:'flex', flexWrap:'wrap', gap:'.4rem', padding:'1rem' }}>
          {phase.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE).map((t, i) => (
            <span key={i} className="tok-chip" style={{ background:(TC[t.type]||'#94a3b8')+'22', color:TC[t.type]||'#94a3b8', borderColor:(TC[t.type]||'#94a3b8')+'44' }}>
              <span style={{ fontFamily:'monospace', fontWeight:700 }}>{t.lexeme}</span>
              <span style={{ fontSize:'.6rem', opacity:.7, display:'block', textAlign:'center' }}>{t.type}</span>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TokenTableTab({ phase }) {
  const rows = phase.tokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE);
  return (
    <div className="pv-pad">
      <Card title="Token Table" right={<span style={{ fontSize:'.8rem', color:'#475569' }}>{rows.length} tokens</span>}>
        <div className="table-wrap">
          <table className="dark-tbl">
            <thead><tr><th>#</th><th>Lexeme</th><th>Token Type</th><th>Line</th><th>Col</th><th>Value</th></tr></thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={i}>
                  <td style={{ color:'#475569' }}>{i+1}</td>
                  <td><span style={{ fontFamily:'monospace', color:TC[t.type]||'#e2e8f0', fontWeight:700 }}>{t.lexeme}</span></td>
                  <td><span className="tok-type-badge" style={{ background:(TC[t.type]||'#475569')+'22', color:TC[t.type]||'#94a3b8' }}>{t.type}</span></td>
                  <td style={{ color:'#64748b' }}>{t.line}</td>
                  <td style={{ color:'#64748b' }}>{t.col}</td>
                  <td style={{ fontFamily:'monospace', color:'#94a3b8', fontSize:'.8rem' }}>{String(t.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DFATableTab() {
  const charClasses = ['L', '_', 'D', '"', "'", '.', '>', '<', '!', '=', '(', ')', 'WS', 'NL', 'OTHER'];
  return (
    <div className="pv-pad">
      <Card title="DFA State Transition Table  δ(state, charClass) → nextState">
        <div style={{ padding:'.75rem .75rem 0', fontSize:'.8rem', color:'#64748b' }}>
          L=letter, D=digit, WS=whitespace, NL=newline, '-'=back-up and emit token
        </div>
        <div className="table-wrap">
          <table className="dark-tbl" style={{ fontSize:'.75rem' }}>
            <thead>
              <tr>
                <th>State \ Input</th>
                {charClasses.map(c => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {DFA_STATES.filter(s => DFA_TRANSITIONS[s]).map(state => (
                <tr key={state}>
                  <td style={{ color:'#fbbf24', fontWeight:700, fontFamily:'monospace' }}>{state}</td>
                  {charClasses.map(cc => {
                    const tr = DFA_TRANSITIONS[state];
                    const next = tr?.[cc] || tr?.['OTHER'] || '–';
                    const color = next === 'ERROR' ? '#f87171' : next === 'ACCEPT' ? '#34d399' : next === '-' ? '#818cf8' : '#94a3b8';
                    return <td key={cc} style={{ color, fontFamily:'monospace', fontWeight: next !== '–' ? 700 : 400 }}>{next}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="States Legend">
        <div style={{ display:'flex', flexWrap:'wrap', gap:'.5rem', padding:'1rem' }}>
          {DFA_STATES.map(s => (
            <span key={s} className="tok-type-badge" style={{ color:'#fbbf24', background:'#fbbf2422' }}>{s}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NFATab() {
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        NFA fragments built by Thompson's Construction — one fragment per token class. The combined NFA is converted to the DFA shown in the DFA Table tab via subset construction.
      </p>
      {NFA_DESCRIPTION.map((nfa, i) => (
        <Card key={i} title={`NFA: ${nfa.name}   regex: ${nfa.regex}`}>
          <div style={{ padding:'1rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div>
              <p className="mini-label">States</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'.3rem' }}>
                {nfa.states.map(s => <span key={s} className="tok-type-badge" style={{ color:'#818cf8', background:'#818cf822' }}>{s}</span>)}
              </div>
              <p className="mini-label" style={{ marginTop:'.75rem' }}>Start: <strong style={{ color:'#34d399' }}>{nfa.start}</strong></p>
              <p className="mini-label">Accept: <strong style={{ color:'#f472b6' }}>{nfa.accept.join(', ')}</strong></p>
            </div>
            <div>
              <p className="mini-label">Transitions</p>
              <table className="dark-tbl" style={{ fontSize:'.75rem' }}>
                <thead><tr><th>From</th><th>Symbol</th><th>To</th></tr></thead>
                <tbody>
                  {nfa.transitions.map(([from, sym, to], j) => (
                    <tr key={j}>
                      <td style={{ color:'#818cf8', fontFamily:'monospace' }}>{from}</td>
                      <td style={{ color: sym === 'ε' ? '#f59e0b' : '#34d399', fontFamily:'monospace', fontWeight:700 }}>{sym}</td>
                      <td style={{ color:'#818cf8', fontFamily:'monospace' }}>{to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ padding:'.5rem 1rem', background:'rgba(99,102,241,.05)', fontSize:'.8rem', color:'#94a3b8', borderTop:'1px solid #334155' }}>
            📝 {nfa.note}
          </div>
        </Card>
      ))}
    </div>
  );
}

function LexerSymTableTab({ phase }) {
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        The lexer populates a preliminary symbol table with every identifier it encounters. The semantic analyzer then enriches these entries with type and scope information.
      </p>
      <Card title="Identifiers Discovered">
        {(!phase.symbolTableEntries || phase.symbolTableEntries.length === 0)
          ? <p style={{ padding:'1rem', color:'#475569' }}>No identifiers found in this rule.</p>
          : (
            <div className="table-wrap">
              <table className="dark-tbl">
                <thead><tr><th>Identifier</th><th>First Seen Line</th><th>First Seen Col</th></tr></thead>
                <tbody>
                  {phase.symbolTableEntries.map((e, i) => (
                    <tr key={i}>
                      <td style={{ color:'#34d399', fontFamily:'monospace', fontWeight:700 }}>{e.name}</td>
                      <td style={{ color:'#64748b' }}>{e.firstLine}</td>
                      <td style={{ color:'#64748b' }}>{e.firstCol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}

function ErrorsTab({ errors }) {
  return (
    <div className="pv-pad">
      {errors.length === 0
        ? <div style={{ color:'#34d399', padding:'1rem' }}>✓ No lexical errors.</div>
        : errors.map((e, i) => <div key={i} className="err-block">{e.toString()}</div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: PARSER VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function ParserView() {
  const { result } = useCompiler();
  const phase = result?.phases?.parser;
  return (
    <div className="admin-page">
      <div className="pv-page-hdr">
        <div><h1>Phase 2 — Syntax Analysis</h1><p>Recursive-descent parser · FIRST/FOLLOW sets · LL(1) table · Parse Tree vs AST</p></div>
        {phase && <PhaseBadge ok={phase.success} />}
      </div>
      {!phase ? <NoResult /> : (
        <Tabs tabs={[
          { label: 'Grammar & FIRST/FOLLOW', content: <GrammarTab /> },
          { label: 'LL(1) Table',            content: <LL1Tab /> },
          { label: 'Parse Trace',            content: <TraceTab steps={phase.steps} /> },
          { label: 'Parse Tree',             content: <ParseTreeTab phase={phase} /> },
          { label: 'AST',                    content: <ASTTreeTab phase={phase} /> },
          { label: 'PT vs AST',             content: <PTvsASTTab phase={phase} /> },
          { label: 'Errors',                 content: <ErrorsTab errors={phase.errors} /> },
        ]} />
      )}
      <PhaseStyles />
    </div>
  );
}

function GrammarTab() {
  return (
    <div className="pv-pad">
      <Card title="Context-Free Grammar (BNF)">
        <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'.35rem' }}>
          {GRAMMAR_RULES.map(r => (
            <div key={r.id} style={{ display:'flex', gap:'.75rem', fontSize:'.82rem', borderBottom:'1px solid #1e293b', paddingBottom:'.3rem' }}>
              <span style={{ color:'#64748b', minWidth:28, fontWeight:700 }}>{r.id}</span>
              <span style={{ color:'#fbbf24', minWidth:110, fontFamily:'monospace', fontWeight:700 }}>{r.lhs}</span>
              <span style={{ color:'#475569' }}>→</span>
              <span style={{ color:'#94a3b8', fontFamily:'monospace' }}>{r.rhs}</span>
              <span style={{ color:'#334155', fontSize:'.75rem', marginLeft:'auto', textAlign:'right', maxWidth:260 }}>{r.note}</span>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <Card title="FIRST Sets">
          <div style={{ padding:'.75rem', display:'flex', flexDirection:'column', gap:'.3rem' }}>
            {Object.entries(FIRST_SETS).map(([nt, set]) => (
              <div key={nt} style={{ display:'flex', gap:'.5rem', fontSize:'.8rem', borderBottom:'1px solid #1e293b', paddingBottom:'.25rem' }}>
                <span style={{ color:'#fbbf24', fontFamily:'monospace', fontWeight:700, minWidth:110 }}>{nt}</span>
                <span style={{ color:'#94a3b8', fontFamily:'monospace' }}>{`{ ${set.join(', ')} }`}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="FOLLOW Sets">
          <div style={{ padding:'.75rem', display:'flex', flexDirection:'column', gap:'.3rem' }}>
            {Object.entries(FOLLOW_SETS).map(([nt, set]) => (
              <div key={nt} style={{ display:'flex', gap:'.5rem', fontSize:'.8rem', borderBottom:'1px solid #1e293b', paddingBottom:'.25rem' }}>
                <span style={{ color:'#f472b6', fontFamily:'monospace', fontWeight:700, minWidth:110 }}>{nt}</span>
                <span style={{ color:'#94a3b8', fontFamily:'monospace' }}>{`{ ${set.join(', ')} }`}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function LL1Tab() {
  return (
    <div className="pv-pad">
      <Card title="LL(1) Parsing Table  M[Non-terminal, Lookahead] → Production">
        <div style={{ padding:'.5rem', fontSize:'.78rem', color:'#64748b' }}>
          Each cell shows which production to apply when expanding the non-terminal (row) and the current lookahead token (column).
        </div>
        <div className="table-wrap">
          <table className="dark-tbl" style={{ fontSize:'.75rem' }}>
            <thead><tr><th>Non-Terminal</th><th>Lookahead</th><th>Production</th><th>Rule</th></tr></thead>
            <tbody>
              {LL1_TABLE.map((row, i) => (
                <tr key={i}>
                  <td style={{ color:'#fbbf24', fontFamily:'monospace', fontWeight:700 }}>{row.nonTerminal}</td>
                  <td><span className="tok-type-badge" style={{ color:'#34d399', background:'#34d39922' }}>{row.lookahead}</span></td>
                  <td style={{ color:'#94a3b8', fontFamily:'monospace' }}>{row.production}</td>
                  <td style={{ color:'#475569' }}>{row.ruleId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TraceTab({ steps }) {
  return (
    <div className="pv-pad">
      <Card title={`Parsing Trace (${steps.length} steps)`}>
        <div style={{ maxHeight:400, overflowY:'auto', padding:'.5rem' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ fontSize:'.78rem', color: s.startsWith('✓') ? '#34d399' : '#94a3b8', padding:'.2rem .4rem', borderLeft:`2px solid ${s.startsWith('✓') ? '#34d399' : '#334155'}`, marginBottom:'.15rem', fontFamily:'monospace' }}>
              {i+1}. {s}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ParseTreeTab({ phase }) {
  const displayTree = phase.parseTree ? parseTreeToDisplayTree(phase.parseTree) : null;
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Parse Tree (Concrete Syntax Tree)</strong> — one node per grammar rule application. Every token and every grammar production is a node. Contrast this with the AST tab.
      </p>
      {!displayTree
        ? <div style={{ color:'#475569' }}>Parse tree not available (compilation failed).</div>
        : (
          <Card title="Parse Tree">
            <div style={{ background:'#0f172a', padding:'1.25rem', borderRadius:8, margin:'.75rem', overflowX:'auto' }}>
              <TreeNode node={displayTree} />
            </div>
          </Card>
        )}
    </div>
  );
}

function ASTTreeTab({ phase }) {
  const displayTree = phase.ast ? astToDisplayTree(phase.ast) : null;
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Abstract Syntax Tree (AST)</strong> — grammar-rule intermediate nodes are eliminated. Only semantically meaningful nodes remain.
      </p>
      {!displayTree
        ? <div style={{ color:'#475569' }}>AST not available.</div>
        : (
          <Card title="AST">
            <div style={{ background:'#0f172a', padding:'1.25rem', borderRadius:8, margin:'.75rem', overflowX:'auto' }}>
              <TreeNode node={displayTree} />
            </div>
          </Card>
        )}
    </div>
  );
}

function PTvsASTTab({ phase }) {
  const pt  = phase.parseTree ? parseTreeToDisplayTree(phase.parseTree) : null;
  const ast = phase.ast       ? astToDisplayTree(phase.ast)             : null;
  return (
    <div className="pv-pad">
      <Card title="Key Differences: Parse Tree vs AST">
        <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'.5rem' }}>
          {[
            { aspect:'Node count',   pt:'One node per grammar-rule application (verbose)', ast:'Only semantically meaningful nodes (compact)' },
            { aspect:'Chain rules',  pt:'CONDITION→OR_EXPR→AND_EXPR nodes all present', ast:'Collapsed — only AND/OR/NOT/COMPARISON nodes' },
            { aspect:'Tokens',       pt:'Keywords like IF, THEN appear as leaf nodes', ast:'IF/THEN removed — implied by RULE node structure' },
            { aspect:'Parentheses',  pt:'( and ) appear as TOKEN leaves', ast:'Grouping encoded in tree shape; no ( ) nodes' },
            { aspect:'Use case',     pt:'Syntax validation, error recovery', ast:'Semantic analysis, code generation' },
          ].map((row, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'120px 1fr 1fr', gap:'.5rem', fontSize:'.8rem', borderBottom:'1px solid #1e293b', paddingBottom:'.4rem' }}>
              <span style={{ color:'#fbbf24', fontWeight:700 }}>{row.aspect}</span>
              <span style={{ color:'#818cf8' }}>PT: {row.pt}</span>
              <span style={{ color:'#34d399' }}>AST: {row.ast}</span>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <Card title="Parse Tree (Concrete)">
          <div style={{ background:'#0f172a', padding:'1rem', margin:'.5rem', overflowX:'auto', maxHeight:360, overflowY:'auto' }}>
            {pt ? <TreeNode node={pt} /> : <span style={{ color:'#475569' }}>N/A</span>}
          </div>
        </Card>
        <Card title="AST (Abstract)">
          <div style={{ background:'#0f172a', padding:'1rem', margin:'.5rem', overflowX:'auto', maxHeight:360, overflowY:'auto' }}>
            {ast ? <TreeNode node={ast} /> : <span style={{ color:'#475569' }}>N/A</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: SEMANTIC VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function SemanticView() {
  const { result } = useCompiler();
  const phase = result?.phases?.semantic;
  return (
    <div className="admin-page">
      <div className="pv-page-hdr">
        <div><h1>Phase 3 — Semantic Analysis</h1><p>Attribute grammars · Type rules · Symbol table · Scope analysis</p></div>
        {phase && <PhaseBadge ok={phase.success} />}
      </div>
      {!phase ? <NoResult /> : (
        <Tabs tabs={[
          { label: 'Checks Log',        content: <SemChecksTab phase={phase} /> },
          { label: 'Symbol Table',      content: <SymTableTab phase={phase} /> },
          { label: 'Attribute Grammar', content: <AttrGrammarTab /> },
          { label: 'Type Rules',        content: <TypeRulesTab /> },
          { label: 'Scope History',     content: <ScopeHistoryTab phase={phase} /> },
          { label: 'Errors',            content: <ErrorsTab errors={phase.errors} /> },
        ]} />
      )}
      <PhaseStyles />
    </div>
  );
}

function SemChecksTab({ phase }) {
  return (
    <div className="pv-pad">
      {phase.warnings.length > 0 && phase.warnings.map((w, i) => (
        <div key={i} className="warn-block">⚠️ {w}</div>
      ))}
      <Card title={`Semantic Checks (${phase.checks.length} entries)`}>
        <div style={{ maxHeight:400, overflowY:'auto' }}>
          {phase.checks.map((c, i) => (
            <div key={i} style={{ fontSize:'.8rem', padding:'.25rem .75rem', borderBottom:'1px solid #1e293b',
              color: c.startsWith('✅') ? '#34d399' : c.startsWith('❌') ? '#f87171' : c.startsWith('⚠️') ? '#fbbf24' : '#64748b',
              fontFamily: c.startsWith('──') ? 'inherit' : 'monospace' }}>
              {c}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SymTableTab({ phase }) {
  if (!phase.symbolTable) return <div className="pv-pad" style={{ color:'#475569' }}>Symbol table not available.</div>;
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        The SymbolTable is a stack of scopes. Scope 0 is global (pre-defined symbols). Scope 1 is the rule body scope opened by the semantic analyzer.
      </p>
      {phase.symbolTable.map(scope => (
        <Card key={scope.level} title={`Scope ${scope.level} — ${scope.label}`}>
          {scope.symbols.length === 0
            ? <p style={{ padding:'1rem', color:'#475569', fontSize:'.85rem' }}>Empty scope.</p>
            : (
              <div className="table-wrap">
                <table className="dark-tbl" style={{ fontSize:'.78rem' }}>
                  <thead><tr><th>Name</th><th>Kind</th><th>Type</th><th>Offset</th><th>ReadOnly</th><th>Usages</th></tr></thead>
                  <tbody>
                    {scope.symbols.map((s, i) => (
                      <tr key={i}>
                        <td style={{ color:'#34d399', fontFamily:'monospace', fontWeight:700 }}>{s.name}</td>
                        <td><span className="tok-type-badge" style={{ color: s.kind==='action_target' ? '#f472b6' : '#818cf8', background: s.kind==='action_target' ? '#f472b622' : '#818cf822' }}>{s.kind}</span></td>
                        <td><span className="tok-type-badge" style={{ color: s.type==='number' ? '#fb923c' : s.type==='string' ? '#a78bfa' : '#34d399', background:'#1e293b' }}>{s.type}</span></td>
                        <td style={{ color:'#64748b', fontFamily:'monospace' }}>{s.offset}</td>
                        <td style={{ color: s.readOnly ? '#f87171' : '#34d399' }}>{s.readOnly ? 'yes' : 'no'}</td>
                        <td style={{ color:'#818cf8' }}>{s.usages}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      ))}
    </div>
  );
}

function AttrGrammarTab() {
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        An <strong style={{ color:'#f1f5f9' }}>Attribute Grammar</strong> extends a CFG by attaching semantic rules to productions. Synthesized attributes flow bottom-up; inherited attributes flow top-down.
      </p>
      {ATTRIBUTE_GRAMMAR_SPEC.map((ag, i) => (
        <Card key={i} title={`${ag.kind} Attribute — ${ag.nonTerminal}.${ag.attribute}`}>
          <div style={{ padding:'1rem' }}>
            <div style={{ fontFamily:'monospace', fontSize:'.82rem', background:'#0f172a', padding:'.75rem', borderRadius:6, marginBottom:'.5rem', color:'#34d399' }}>
              {ag.rule}
            </div>
            <p style={{ fontSize:'.82rem', color:'#94a3b8' }}>{ag.explanation}</p>
            <span className="tok-type-badge" style={{ marginTop:'.5rem', display:'inline-block', color: ag.kind==='Synthesized' ? '#818cf8' : '#f472b6', background: ag.kind==='Synthesized' ? '#818cf822' : '#f472b622' }}>
              {ag.kind}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TypeRulesTab() {
  return (
    <div className="pv-pad">
      <Card title="Type Compatibility Rules">
        <div className="table-wrap">
          <table className="dark-tbl" style={{ fontSize:'.78rem' }}>
            <thead><tr><th>Operator</th><th>Left Type</th><th>Right Type</th><th>Result Type</th><th>Valid?</th><th>Notes</th></tr></thead>
            <tbody>
              {TYPE_RULES.map((r, i) => (
                <tr key={i}>
                  <td style={{ color:'#fbbf24', fontFamily:'monospace', fontWeight:700 }}>{r.operator}</td>
                  <td style={{ color:'#fb923c', fontFamily:'monospace' }}>{r.leftType}</td>
                  <td style={{ color:'#fb923c', fontFamily:'monospace' }}>{r.rightType}</td>
                  <td style={{ color:'#a78bfa', fontFamily:'monospace' }}>{r.resultType}</td>
                  <td style={{ color: r.valid ? '#34d399' : '#f87171', fontWeight:700 }}>{r.valid ? '✓' : '✗'}</td>
                  <td style={{ color:'#64748b', fontSize:'.75rem' }}>{r.reason || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ScopeHistoryTab({ phase }) {
  if (!phase.history || phase.history.length === 0) return <div className="pv-pad" style={{ color:'#475569' }}>No scope history available.</div>;
  const opColors = { ENTER_SCOPE:'#34d399', EXIT_SCOPE:'#f87171', INSERT:'#818cf8', LOOKUP:'#fbbf24' };
  return (
    <div className="pv-pad">
      <Card title={`Symbol Table Operations (${phase.history.length} operations)`}>
        <div style={{ maxHeight:400, overflowY:'auto' }}>
          {phase.history.map((h, i) => (
            <div key={i} style={{ display:'flex', gap:'.75rem', padding:'.3rem .75rem', borderBottom:'1px solid #1e293b', fontSize:'.78rem', alignItems:'center' }}>
              <span className="tok-type-badge" style={{ color: opColors[h.op]||'#94a3b8', background:(opColors[h.op]||'#94a3b8')+'22', minWidth:100, textAlign:'center' }}>{h.op}</span>
              {h.name && <span style={{ color:'#34d399', fontFamily:'monospace' }}>{h.name}</span>}
              {h.type && <span style={{ color:'#fb923c' }}>:{h.type}</span>}
              {h.kind && <span style={{ color:'#64748b' }}>({h.kind})</span>}
              {h.level !== undefined && <span style={{ color:'#475569', marginLeft:'auto' }}>scope={h.level}</span>}
              {h.found !== undefined && <span style={{ color: h.found ? '#34d399' : '#f87171' }}>{h.found ? 'found' : 'not found'}</span>}
              {h.offset !== undefined && <span style={{ color:'#475569' }}>offset={h.offset}</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: AST VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function ASTView() {
  const { result } = useCompiler();
  const phase = result?.phases?.parser;
  const ast  = phase?.ast   ? astToDisplayTree(phase.ast)            : null;
  const pt   = phase?.parseTree ? parseTreeToDisplayTree(phase.parseTree) : null;
  return (
    <div className="admin-page">
      <div className="pv-page-hdr">
        <div><h1>Phase 4 — Abstract Syntax Tree</h1><p>Parse Tree vs AST — both constructed from the actual parser output</p></div>
      </div>
      {!phase ? <NoResult /> : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <Card title="Parse Tree (Concrete)">
              <div style={{ background:'#0f172a', padding:'1.25rem', margin:'.5rem', borderRadius:8, overflowX:'auto', minHeight:200 }}>
                {pt ? <TreeNode node={pt} /> : <span style={{ color:'#475569' }}>Not available</span>}
              </div>
            </Card>
            <Card title="AST (Abstract)">
              <div style={{ background:'#0f172a', padding:'1.25rem', margin:'.5rem', borderRadius:8, overflowX:'auto', minHeight:200 }}>
                {ast ? <TreeNode node={ast} /> : <span style={{ color:'#475569' }}>Not available</span>}
              </div>
            </Card>
          </div>
          <Card title="Node Type Legend">
            <div style={{ display:'flex', flexWrap:'wrap', gap:'.5rem', padding:'1rem' }}>
              {[['RULE','#818cf8'],['AND/OR','#34d399'],['NOT','#f472b6'],['COMPARISON','#fbbf24'],['BINARY_OP','#fb923c'],['IDENTIFIER','#34d399'],['NUMBER/STRING','#a78bfa'],['ACTION','#ec4899']].map(([label,color]) => (
                <span key={label} style={{ padding:'.2rem .6rem', borderRadius:6, background:color+'22', color, border:`1px solid ${color}44`, fontSize:'.78rem', fontWeight:700 }}>{label}</span>
              ))}
            </div>
          </Card>
        </>
      )}
      <PhaseStyles />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: TAC VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function TACView() {
  const { result } = useCompiler();
  const phase = result?.phases?.tac;
  const tacText = phase?.formatted?.map(f => `${f.ln}: ${f.line}  // ${f.comment}`).join('\n') || '';
  return (
    <div className="admin-page">
      <div className="pv-page-hdr">
        <div><h1>Phase 5 — Intermediate Code (TAC)</h1><p>Quadruples · Triples · Indirect Triples</p></div>
        {phase && <PhaseBadge ok={phase.success} />}
      </div>
      {!phase ? <NoResult /> : (
        <Tabs tabs={[
          { label: 'Quadruples',        content: <QuadruplesTab phase={phase} tacText={tacText} /> },
          { label: 'Triples',           content: <TriplesTab phase={phase} /> },
          { label: 'Indirect Triples',  content: <IndirectTriplesTab phase={phase} /> },
          { label: 'Comparison',        content: <RepresentationCompareTab phase={phase} /> },
        ]} />
      )}
      <PhaseStyles />
    </div>
  );
}

function QuadruplesTab({ phase, tacText }) {
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Quadruple:</strong> each instruction has 4 fields: (op, arg1, arg2, result). The result field is explicit.
      </p>
      <Card title="Formatted TAC" right={<CopyBtn text={tacText} />}>
        <div className="code-block" style={{ margin:'.5rem' }}>
          {phase.formatted.map(f => (
            <div key={f.ln} style={{ display:'flex', gap:'1.5rem' }}>
              <span style={{ color:'#334155', userSelect:'none', minWidth:20 }}>{f.ln}</span>
              <span style={{ flex:1, color:'#e2e8f0' }}>{f.line}</span>
              <span style={{ color:'#475569', fontSize:'.78rem' }}>{`// ${f.comment}`}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Quadruples Table (op, arg1, arg2, result)">
        <div className="table-wrap">
          <table className="dark-tbl" style={{ fontSize:'.78rem' }}>
            <thead><tr><th>#</th><th>op</th><th>arg1</th><th>arg2</th><th>result</th><th>comment</th></tr></thead>
            <tbody>
              {phase.quadruples.map((q, i) => (
                <tr key={i}>
                  <td style={{ color:'#475569' }}>{i+1}</td>
                  <td style={{ color:'#fbbf24', fontFamily:'monospace', fontWeight:700 }}>{q.op}</td>
                  <td style={{ color:'#fb923c', fontFamily:'monospace' }}>{q.arg1 ?? '—'}</td>
                  <td style={{ color:'#fb923c', fontFamily:'monospace' }}>{q.arg2 ?? '—'}</td>
                  <td style={{ color:'#34d399', fontFamily:'monospace', fontWeight:700 }}>{q.result ?? '—'}</td>
                  <td style={{ color:'#475569', fontSize:'.75rem' }}>{q.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TriplesTab({ phase }) {
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Triple:</strong> the result field is dropped. Results are referenced by their instruction index <code style={{ color:'#fbbf24' }}>(i)</code>. Saves memory but makes reordering harder.
      </p>
      <Card title="Triples Table (idx, op, arg1, arg2)">
        <div className="table-wrap">
          <table className="dark-tbl" style={{ fontSize:'.78rem' }}>
            <thead><tr><th>idx</th><th>op</th><th>arg1</th><th>arg2</th><th>comment</th></tr></thead>
            <tbody>
              {phase.triples.map((t, i) => (
                <tr key={i}>
                  <td style={{ color:'#818cf8', fontFamily:'monospace', fontWeight:700 }}>({t.idx})</td>
                  <td style={{ color:'#fbbf24', fontFamily:'monospace', fontWeight:700 }}>{t.op}</td>
                  <td style={{ color:'#fb923c', fontFamily:'monospace' }}>{t.arg1 ?? '—'}</td>
                  <td style={{ color:'#fb923c', fontFamily:'monospace' }}>{t.arg2 ?? '—'}</td>
                  <td style={{ color:'#475569', fontSize:'.75rem' }}>{t.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function IndirectTriplesTab({ phase }) {
  const fmt = phase.fmtIndirect || [];
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Indirect Triples:</strong> a pointer array into the triples table. Reordering instructions (e.g., loop-invariant code motion) only requires changing the pointer array, not the triples table itself.
      </p>
      <Card title="Pointer Array + Execution Order">
        <div className="table-wrap">
          <table className="dark-tbl" style={{ fontSize:'.78rem' }}>
            <thead><tr><th>Exec Order</th><th>Pointer → Triple</th><th>Instruction</th><th>Comment</th></tr></thead>
            <tbody>
              {fmt.map((row, i) => (
                <tr key={i}>
                  <td style={{ color:'#64748b' }}>{row.execOrder}</td>
                  <td style={{ color:'#818cf8', fontFamily:'monospace', fontWeight:700 }}>→ ({row.ptr})</td>
                  <td style={{ color:'#94a3b8', fontFamily:'monospace' }}>{row.triple}</td>
                  <td style={{ color:'#475569', fontSize:'.75rem' }}>{row.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RepresentationCompareTab({ phase }) {
  return (
    <div className="pv-pad">
      <Card title="Comparison of IR Representations">
        <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'.5rem' }}>
          {[
            { aspect:'Fields per entry', quad:'4 (op, arg1, arg2, result)', triple:'3 (op, arg1, arg2)', indirect:'3 + pointer array' },
            { aspect:'Result reference', quad:'Explicit name (e.g., t1)', triple:'Implicit position (e.g., (0))', indirect:'Implicit position + pointer' },
            { aspect:'Reordering',       quad:'Easy — just move the entry', triple:'Breaks references (renumber)', indirect:'Easy — change pointer array only' },
            { aspect:'Memory',           quad:'More memory (4 fields)', triple:'Less memory (3 fields)', indirect:'Triples + pointer array' },
            { aspect:'Use case',         quad:'Most common in real compilers', triple:'Historical; compact', indirect:'Loop optimization, code motion' },
          ].map((r, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'140px 1fr 1fr 1fr', gap:'.5rem', fontSize:'.78rem', borderBottom:'1px solid #1e293b', paddingBottom:'.4rem' }}>
              <span style={{ color:'#fbbf24', fontWeight:700 }}>{r.aspect}</span>
              <span style={{ color:'#818cf8' }}>Quad: {r.quad}</span>
              <span style={{ color:'#34d399' }}>Triple: {r.triple}</span>
              <span style={{ color:'#f472b6' }}>Indirect: {r.indirect}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: OPTIMIZER VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function OptimizerView() {
  const { result } = useCompiler();
  const phase = result?.phases?.optimizer;
  return (
    <div className="admin-page">
      <div className="pv-page-hdr">
        <div><h1>Phase 6 — Code Optimizer</h1><p>CFG · Basic Blocks · Liveness · Reaching Defs · CSE · 7 passes · Loop notes</p></div>
        {phase && <PhaseBadge ok={phase.success} />}
      </div>
      {!phase ? <NoResult /> : (
        <Tabs tabs={[
          { label: 'Summary',           content: <OptSummaryTab phase={phase} /> },
          { label: 'Basic Blocks / CFG',content: <CFGTab phase={phase} /> },
          { label: 'Liveness Analysis', content: <LivenessTab phase={phase} /> },
          { label: 'Reaching Defs',     content: <ReachingDefsTab phase={phase} /> },
          { label: 'CSE / Value #',     content: <CSETab phase={phase} /> },
          { label: 'Transformations',   content: <TransformTab phase={phase} /> },
          { label: 'Loop Optimization', content: <LoopOptTab phase={phase} /> },
          { label: 'Before vs After',   content: <BeforeAfterTab phase={phase} /> },
        ]} />
      )}
      <PhaseStyles />
    </div>
  );
}

function OptSummaryTab({ phase }) {
  return (
    <div className="pv-pad">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1rem' }}>
        {[
          { label:'Original',     value:phase.originalCount,  color:'#94a3b8' },
          { label:'Optimized',    value:phase.optimizedCount, color:'#34d399' },
          { label:'Removed',      value:phase.reductionCount, color:'#fbbf24' },
          { label:'Transforms',   value:phase.transformations.length, color:'#818cf8' },
        ].map(s => (
          <div key={s.label} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:'1rem', textAlign:'center' }}>
            <p style={{ fontSize:'1.75rem', fontWeight:800, color:s.color }}>{s.value}</p>
            <p style={{ fontSize:'.75rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CFGTab({ phase }) {
  const blocks = phase.basicBlocks || [];
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Control Flow Graph:</strong> nodes are basic blocks (maximal straight-line sequences); edges show possible control transfers (fall-through and branch).
      </p>
      {blocks.length === 0
        ? <div style={{ color:'#475569' }}>No basic blocks (rule too simple or compilation failed).</div>
        : blocks.map((block, i) => (
          <Card key={i} title={`Basic Block ${block.id}  (instructions ${block.startIdx}–${block.startIdx + block.instructions.length - 1})`}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'1rem', padding:'1rem' }}>
              <div>
                {block.instructions.map((instr, j) => (
                  <div key={j} style={{ fontFamily:'monospace', fontSize:'.8rem', color:'#e2e8f0', padding:'.15rem 0', borderBottom:'1px solid #1e293b' }}>
                    {instr.op === 'LABEL' ? `${instr.result}:` : instr.op === 'IF_FALSE' ? `if_false ${instr.arg1} goto ${instr.result}` : instr.op === 'GOTO' ? `goto ${instr.result}` : instr.op === '=' ? `${instr.result} = ${instr.arg1}` : instr.arg2 ? `${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}` : `${instr.result} = ${instr.op} ${instr.arg1}`}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:'.78rem' }}>
                {block.predecessors.length > 0 && <p style={{ color:'#f472b6' }}>← from: {block.predecessors.join(', ')}</p>}
                {block.successors.length > 0   && <p style={{ color:'#34d399' }}>→ to: {block.successors.join(', ')}</p>}
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}

function LivenessTab({ phase }) {
  const liveness = phase.liveness || [];
  const original = phase.formattedOriginal || [];
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Liveness Analysis</strong> (backward data flow): a variable is <em>live</em> at a point if it may be used on some path from that point onward. Used to detect dead temporaries.
      </p>
      <Card title="Live-in / Live-out per instruction">
        <div className="table-wrap">
          <table className="dark-tbl" style={{ fontSize:'.78rem' }}>
            <thead><tr><th>#</th><th>Instruction</th><th>live_in</th><th>live_out</th></tr></thead>
            <tbody>
              {liveness.map((row, i) => (
                <tr key={i}>
                  <td style={{ color:'#475569' }}>{i+1}</td>
                  <td style={{ fontFamily:'monospace', color:'#e2e8f0' }}>{original[i]?.line || '–'}</td>
                  <td style={{ fontFamily:'monospace', color:'#818cf8', fontSize:'.75rem' }}>{'{'+row.live_in.join(', ')+'}'}</td>
                  <td style={{ fontFamily:'monospace', color:'#34d399', fontSize:'.75rem' }}>{'{'+row.live_out.join(', ')+'}'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReachingDefsTab({ phase }) {
  const { allDefs = [], reachMap = {} } = phase.reachingDefs || {};
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Reaching Definitions</strong> (forward data flow): definition d reaches point p if there is a path from d to p with no re-definition of the same variable.
      </p>
      <Card title="All Definitions">
        <div className="table-wrap">
          <table className="dark-tbl" style={{ fontSize:'.78rem' }}>
            <thead><tr><th>Quad #</th><th>Variable Defined</th></tr></thead>
            <tbody>
              {allDefs.map((d, i) => (
                <tr key={i}>
                  <td style={{ color:'#818cf8', fontFamily:'monospace' }}>{d.quadIdx+1}</td>
                  <td style={{ color:'#34d399', fontFamily:'monospace', fontWeight:700 }}>{d.varName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Reaching Map (variable → defining instructions)">
        <div style={{ padding:'.75rem', display:'flex', flexDirection:'column', gap:'.3rem' }}>
          {Object.entries(reachMap).map(([v, defs]) => (
            <div key={v} style={{ display:'flex', gap:'.75rem', fontSize:'.8rem', borderBottom:'1px solid #1e293b', paddingBottom:'.25rem' }}>
              <span style={{ color:'#34d399', fontFamily:'monospace', fontWeight:700, minWidth:120 }}>{v}</span>
              <span style={{ color:'#818cf8' }}>reaches from quad(s): {defs.map(d => d+1).join(', ')}</span>
            </div>
          ))}
          {Object.keys(reachMap).length === 0 && <p style={{ color:'#475569' }}>No variable uses tracked (all operands are literals).</p>}
        </div>
      </Card>
    </div>
  );
}

function CSETab({ phase }) {
  const { log = [], vnTable = {} } = phase.valueNumbering || {};
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Common Subexpression Elimination</strong> via <strong style={{ color:'#f1f5f9' }}>Value Numbering</strong>: assign a unique number to each distinct computed value. Expressions with the same value number are CSE candidates.
      </p>
      <Card title="Value Numbering Log">
        {log.length === 0
          ? <p style={{ padding:'1rem', color:'#475569' }}>No value-numbering activity (no expressions to number).</p>
          : log.map((entry, i) => (
            <div key={i} style={{ padding:'.4rem .75rem', borderBottom:'1px solid #1e293b', fontSize:'.8rem', display:'flex', gap:.75+'rem' }}>
              <span className="tok-type-badge" style={{ color: entry.type==='CSE' ? '#34d399' : '#818cf8', background: entry.type==='CSE' ? '#34d39922' : '#818cf822', minWidth:50, textAlign:'center' }}>{entry.type}</span>
              <span style={{ color:'#94a3b8', fontFamily:'monospace' }}>{entry.msg}</span>
            </div>
          ))}
      </Card>
      <Card title="Value Number Table">
        {Object.keys(vnTable).length === 0
          ? <p style={{ padding:'1rem', color:'#475569' }}>Empty.</p>
          : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'.4rem', padding:'.75rem' }}>
              {Object.entries(vnTable).map(([v, vn]) => (
                <span key={v} className="tok-type-badge" style={{ color:'#a78bfa', background:'#a78bfa22' }}>{v} → {vn}</span>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}

function TransformTab({ phase }) {
  return (
    <div className="pv-pad">
      <Card title="Transformations Applied">
        {phase.transformations.map((t, i) => (
          <div key={i} style={{ display:'flex', gap:'.75rem', padding:'.5rem .75rem', borderBottom:'1px solid #1e293b', fontSize:'.8rem' }}>
            <span className="tok-type-badge" style={{ color:'#818cf8', background:'#818cf822', minWidth:200, flexShrink:0 }}>{t.pass}</span>
            <span style={{ color:'#94a3b8', fontFamily:'monospace' }}>{t.msg}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function LoopOptTab({ phase }) {
  const notes = phase.loopNotes || [];
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        The rule language has no loops. These algorithms are documented below as they appear in compiler design courses and apply to any loop-bearing IR.
      </p>
      {notes.map((n, i) => (
        <Card key={i} title={n.technique}>
          <div style={{ padding:'1rem' }}>
            <div style={{ marginBottom:'.5rem' }}>
              <span style={{ fontSize:'.78rem', fontWeight:700, padding:'.2rem .55rem', borderRadius:4, background: n.applicable ? '#34d39922' : '#f8711122', color: n.applicable ? '#34d399' : '#f87171' }}>
                {n.applicable ? 'APPLICABLE' : 'NOT APPLICABLE'}
              </span>
            </div>
            <p style={{ fontSize:'.82rem', color:'#94a3b8', marginBottom:'.5rem' }}>{n.reason}</p>
            <div style={{ fontFamily:'monospace', fontSize:'.78rem', color:'#64748b', background:'#0f172a', padding:'.5rem .75rem', borderRadius:6 }}>
              {n.example}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function BeforeAfterTab({ phase }) {
  return (
    <div className="pv-pad">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
        <Card title="Before Optimization">
          <div className="code-block" style={{ margin:'.5rem', fontSize:'.8rem' }}>
            {(phase.formattedOriginal||[]).map(f => <div key={f.ln}>{f.ln}: {f.line}</div>)}
          </div>
        </Card>
        <Card title="After Optimization" right={<span style={{ color:'#34d399', fontSize:'.75rem', fontWeight:700 }}>{phase.reductionCount} instructions removed</span>}>
          <div className="code-block" style={{ margin:'.5rem', fontSize:'.8rem' }}>
            {(phase.formattedOptimized||[]).map(f => <div key={f.ln}>{f.ln}: {f.line}</div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: CODE GEN VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function CodeGenView() {
  const { result } = useCompiler();
  const phase = result?.phases?.codeGen;
  function download(text, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type:'text/plain' }));
    a.download = name; a.click();
  }
  return (
    <div className="admin-page">
      <div className="pv-page-hdr">
        <div><h1>Phase 7 — Code Generation</h1><p>Pseudo-assembly · Register allocation (graph coloring) · JS from optimized TAC</p></div>
        {phase && <PhaseBadge ok={phase.success} />}
      </div>
      {!phase ? <NoResult /> : (
        <Tabs tabs={[
          { label: 'Pseudo-Assembly',   content: <AsmTab phase={phase} download={download} /> },
          { label: 'Register Alloc',    content: <RegAllocTab phase={phase} /> },
          { label: 'JS (from TAC)',     content: <JSFromTACTab phase={phase} download={download} /> },
          { label: 'JS (from AST)',     content: <JSFromASTTab phase={phase} download={download} /> },
          { label: 'TAC vs AST diff',   content: <TACvsASTTab phase={phase} /> },
          { label: 'Translation Steps', content: <TransStepsTab phase={phase} /> },
        ]} />
      )}
      <PhaseStyles />
    </div>
  );
}

function AsmTab({ phase, download }) {
  const asmText = (phase.pseudoAsm || []).map(l => l.instr + (l.comment ? `  ; ${l.comment}` : '')).join('\n');
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        Generated pseudo-assembly for an 8-register machine (R0–R7). Each TAC quadruple maps to one or two assembly instructions via template matching.
      </p>
      <Card title="Pseudo-Assembly" right={
        <div style={{ display:'flex', gap:'.5rem' }}>
          <CopyBtn text={asmText} />
          <button className="copy-btn" onClick={() => download(asmText, 'rule.asm')}><Download size={13} /> .asm</button>
        </div>
      }>
        <div className="code-block" style={{ margin:'.5rem' }}>
          {(phase.pseudoAsm || []).map((l, i) => (
            <div key={i} style={{ display:'flex', gap:'2rem' }}>
              <span style={{ color:'#334155', minWidth:20 }}>{i+1}</span>
              <span style={{ color: l.instr.endsWith(':') ? '#fbbf24' : '#e2e8f0', fontWeight: l.instr.endsWith(':') ? 700 : 400 }}>{l.instr}</span>
              {l.comment && <span style={{ color:'#475569' }}>; {l.comment}</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RegAllocTab({ phase }) {
  const ra = phase.registerAlloc;
  if (!ra) return <div className="pv-pad" style={{ color:'#475569' }}>Register allocation data not available.</div>;
  return (
    <div className="pv-pad">
      <p style={{ color:'#64748b', fontSize:'.85rem', marginBottom:'1rem' }}>
        <strong style={{ color:'#f1f5f9' }}>Graph Coloring Register Allocation:</strong> build an interference graph (nodes = live ranges, edges = simultaneous liveness), then color with k colors (k = #registers). Spills go to memory.
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
        <Card title="Variable → Register Assignment">
          <div style={{ padding:'.75rem', display:'flex', flexWrap:'wrap', gap:'.4rem' }}>
            {Object.entries(ra.color).map(([v, r]) => (
              <span key={v} className="tok-type-badge" style={{ color: r==='MEM' ? '#f87171' : '#34d399', background: r==='MEM' ? '#f8711122' : '#34d39922' }}>
                {v} → {r}
              </span>
            ))}
          </div>
        </Card>
        <Card title="Spilled Variables (→ Memory)">
          {ra.spills.length === 0
            ? <p style={{ padding:'.75rem', color:'#34d399' }}>✓ No spills — all variables fit in registers.</p>
            : ra.spills.map((s, i) => <div key={i} style={{ padding:'.3rem .75rem', color:'#f87171' }}>{s} → MEM (spilled)</div>)}
        </Card>
      </div>
      <Card title="Interference Graph Edges">
        {ra.interferenceEdges.filter(e => e.to.length > 0).length === 0
          ? <p style={{ padding:'.75rem', color:'#475569' }}>No interference edges (no variables simultaneously live).</p>
          : ra.interferenceEdges.filter(e => e.to.length > 0).map((e, i) => (
            <div key={i} style={{ fontSize:'.8rem', padding:'.25rem .75rem', borderBottom:'1px solid #1e293b', fontFamily:'monospace', color:'#94a3b8' }}>
              <span style={{ color:'#818cf8' }}>{e.from}</span> — interferes with — <span style={{ color:'#f472b6' }}>{e.to.join(', ')}</span>
            </div>
          ))}
      </Card>
    </div>
  );
}

function JSFromTACTab({ phase, download }) {
  const code = phase.jsFromTAC || '';
  return (
    <div className="pv-pad">
      <div className="alert-note" style={{ marginBottom:'1rem' }}>
        ✅ This JavaScript is generated from the <strong>OPTIMIZED TAC</strong> (not the raw AST). This closes the AST→CodeGen gap present in the original implementation.
      </div>
      <Card title="JavaScript (from Optimized TAC)" right={
        <div style={{ display:'flex', gap:'.5rem' }}>
          <CopyBtn text={code} />
          <button className="copy-btn" onClick={() => download(code, 'rule-from-tac.js')}><Download size={13} /> .js</button>
        </div>
      }>
        <pre className="code-block" style={{ margin:'.5rem' }}>{code}</pre>
      </Card>
    </div>
  );
}

function JSFromASTTab({ phase, download }) {
  const code = phase.jsFromAST || '';
  return (
    <div className="pv-pad">
      <div className="alert-note" style={{ marginBottom:'1rem', borderColor:'#f59e0b' }}>
        📚 Reference only — generated directly from the AST (without going through TAC/optimizer). Shown here for comparison with the TAC-based version.
      </div>
      <Card title="JavaScript (from AST — reference)" right={
        <div style={{ display:'flex', gap:'.5rem' }}>
          <CopyBtn text={code} />
          <button className="copy-btn" onClick={() => download(code, 'rule-from-ast.js')}><Download size={13} /> .js</button>
        </div>
      }>
        <pre className="code-block" style={{ margin:'.5rem' }}>{code}</pre>
      </Card>
    </div>
  );
}

function TACvsASTTab({ phase }) {
  return (
    <div className="pv-pad">
      <Card title="Code Generation: TAC-based vs AST-based">
        <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'.5rem' }}>
          {[
            { aspect:'Input',          tac:'Optimized TAC quadruples',   ast:'Raw AST nodes' },
            { aspect:'Optimization',   tac:'Benefits from all 7 passes', ast:'Uses unoptimized structure' },
            { aspect:'Academic',       tac:'Correct pipeline order',     ast:'Skips IR phase (shortcut)' },
            { aspect:'Instruction sel.',tac:'Template match on (op, arg1, arg2, result)', ast:'Recursive tree walk' },
            { aspect:'Output quality', tac:'Reflects optimizer decisions', ast:'May include dead code' },
          ].map((r, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'150px 1fr 1fr', gap:'.5rem', fontSize:'.8rem', borderBottom:'1px solid #1e293b', paddingBottom:'.4rem' }}>
              <span style={{ color:'#fbbf24', fontWeight:700 }}>{r.aspect}</span>
              <span style={{ color:'#34d399' }}>TAC: {r.tac}</span>
              <span style={{ color:'#818cf8' }}>AST: {r.ast}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TransStepsTab({ phase }) {
  return (
    <div className="pv-pad">
      <Card title="Translation Explanation">
        {(phase.translationSteps || []).map((s, i) => (
          <div key={i} style={{ display:'flex', gap:'1rem', padding:'.5rem .75rem', borderBottom:'1px solid #1e293b', fontSize:'.85rem' }}>
            <span style={{ color:'#818cf8', fontWeight:700, minWidth:220, flexShrink:0 }}>{s.label}</span>
            <span style={{ color:'#94a3b8' }}>{s.detail}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
function PhaseStyles() {
  return (
    <style>{`
      .admin-page { padding:.5rem 0; }
      .pv-page-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
      .pv-page-hdr h1 { color:#f1f5f9; font-size:1.4rem; }
      .pv-page-hdr p  { color:#64748b; font-size:.875rem; }
      .pv-pad { padding:.75rem 0; }
      .pv-card { background:#1e293b; border:1px solid #334155; border-radius:14px; overflow:hidden; }
      .pv-card-hdr { padding:.875rem 1.25rem; border-bottom:1px solid #334155; font-weight:700; color:#f1f5f9; font-size:.9rem; display:flex; align-items:center; }
      .code-block { background:#0f172a; color:#e2e8f0; padding:1.25rem; font-family:'JetBrains Mono','Fira Code','Courier New',monospace; font-size:.82rem; line-height:1.7; overflow-x:auto; white-space:pre; }
      .err-block { padding:.625rem .875rem; background:rgba(239,68,68,.08); border-left:3px solid #ef4444; color:#fca5a5; font-family:monospace; font-size:.8rem; border-bottom:1px solid #1e293b; }
      .warn-block { padding:.5rem .875rem; background:rgba(245,158,11,.08); border-left:3px solid #f59e0b; color:#fcd34d; font-family:monospace; font-size:.8rem; border-bottom:1px solid #1e293b; margin-bottom:.5rem; }
      .tok-chip { display:flex; flex-direction:column; align-items:center; padding:.3rem .5rem; border-radius:6px; border:1px solid; font-size:.75rem; }
      .tok-type-badge { padding:.15rem .4rem; border-radius:4px; font-size:.72rem; font-weight:700; display:inline-block; }
      .mini-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#475569; margin-bottom:.35rem; }
      .table-wrap { overflow-x:auto; }
      .dark-tbl { width:100%; border-collapse:collapse; }
      .dark-tbl th { background:#0f172a; padding:.6rem 1rem; font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#475569; border-bottom:1px solid #334155; text-align:left; white-space:nowrap; }
      .dark-tbl td { padding:.6rem 1rem; border-bottom:1px solid #1e293b; font-size:.82rem; color:#94a3b8; }
      .dark-tbl tr:hover td { background:#0f172a; }
      .copy-btn { display:flex; align-items:center; gap:.3rem; background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.3); color:#818cf8; font-size:.75rem; padding:.3rem .65rem; border-radius:6px; cursor:pointer; }
      .copy-btn:hover { background:rgba(99,102,241,.2); }
      .ph-badge { padding:.25rem .7rem; border-radius:100px; font-size:.75rem; font-weight:700; }
      .ph-badge.ok   { background:rgba(52,211,153,.15); color:#34d399; border:1px solid rgba(52,211,153,.3); }
      .ph-badge.fail { background:rgba(248,113,113,.15); color:#f87171; border:1px solid rgba(248,113,113,.3); }
      .tab-bar { display:flex; flex-wrap:wrap; gap:.25rem; padding:.5rem .75rem; background:#0f172a; border-bottom:1px solid #334155; border-radius:14px 14px 0 0; }
      .tab-btn { background:rgba(100,116,139,.1); border:1px solid #334155; color:#64748b; font-size:.75rem; padding:.3rem .65rem; border-radius:6px; cursor:pointer; transition:all .15s; white-space:nowrap; }
      .tab-btn:hover { background:rgba(99,102,241,.1); color:#818cf8; }
      .tab-btn.active { background:rgba(99,102,241,.2); color:#818cf8; border-color:#818cf8; font-weight:700; }
      .alert-note { background:rgba(52,211,153,.08); border-left:3px solid #34d399; padding:.625rem .875rem; font-size:.82rem; color:#34d399; border-radius:6px; }
    `}</style>
  );
}
