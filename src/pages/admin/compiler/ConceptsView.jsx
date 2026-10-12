import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

const CONCEPTS = [
  {
    title: 'Lexical Analysis (Scanning)',
    tag: 'Phase 1',
    color: '#818cf8',
    content: `A lexical analyzer (lexer/scanner) reads source characters and groups them into meaningful tokens.

Implementation in this project:
• Hand-written scanner in lexer.js
• Supports: KEYWORD, IDENTIFIER, OPERATOR, NUMBER, STRING, BOOLEAN, LPAREN, RPAREN tokens
• Detects lexical errors: unterminated strings, unknown identifiers, invalid characters
• Each token records: lexeme, type, line number, column number

Key algorithms:
• Maximal munch: greedily consume the longest valid token
• Keyword detection: check if identifier matches KEYWORDS set {IF, THEN, AND, OR, NOT}
• String scanning: track opening/closing quotes, detect newlines inside strings`
  },
  {
    title: 'Syntax Analysis (Parsing)',
    tag: 'Phase 2',
    color: '#34d399',
    content: `A parser takes the token stream and checks whether it conforms to the grammar, building a parse tree.

Implementation: Recursive-descent parser (parser.js)
• Each grammar rule maps to one parse method
• Operator precedence: OR < AND < NOT < COMPARISON < EXPRESSION < TERM < FACTOR
• Error recovery: produces helpful messages with line/column

Grammar (BNF):
  RULE       → IF CONDITION THEN ACTION
  CONDITION  → OR_EXPR
  OR_EXPR    → AND_EXPR (OR AND_EXPR)*
  AND_EXPR   → NOT_EXPR (AND NOT_EXPR)*
  NOT_EXPR   → NOT NOT_EXPR | COMPARISON
  COMPARISON → EXPRESSION REL_OP EXPRESSION
  EXPRESSION → TERM ((+|-) TERM)*
  TERM       → FACTOR ((*|/) FACTOR)*
  FACTOR     → NUMBER | STRING | BOOLEAN | IDENTIFIER | ( CONDITION )
  ACTION     → IDENTIFIER = EXPRESSION`
  },
  {
    title: 'Semantic Analysis',
    tag: 'Phase 3',
    color: '#fbbf24',
    content: `Semantic analysis checks meaning beyond syntax: type compatibility, identifier validity, value ranges.

Implementation in semantic.js:
• Symbol table: IDENTIFIER_TYPES maps each variable to its type (number/string/boolean)
• Type inference: walk the AST and infer expression types
• Type checking: operators must receive compatible operand types
  - Arithmetic: number op number
  - Comparison: same types only (can't compare number with string)
  - String comparison: only = and != are valid (not >, <, etc.)
• Range constraints: discount 0-100%, cart_total 0-10000000, etc.
• Action validation: only 'discount', 'shipping', 'price' are valid action targets`
  },
  {
    title: 'Abstract Syntax Tree (AST)',
    tag: 'Phase 4',
    color: '#f472b6',
    content: `The AST is a pruned parse tree that removes redundant syntactic nodes, keeping only semantically meaningful structure.

Differences from Parse Tree:
• Parse tree: one node per grammar rule application
• AST: only meaningful nodes (no epsilon-productions, no grouping nodes)

AST Node Types in this project:
  RULE       → { condition, action }
  AND/OR     → { left, right, op }
  NOT        → { operand }
  COMPARISON → { left, right, operator }
  BINARY_OP  → { left, right, operator }
  IDENTIFIER → { name }
  NUMBER     → { value }
  STRING     → { value }
  BOOLEAN    → { value }
  ACTION     → { target, value }

The AST is built by the parser during parsing — not post-processed.
Visualization uses SVG-like recursive HTML tree rendering.`
  },
  {
    title: 'Intermediate Code Generation (TAC)',
    tag: 'Phase 5',
    color: '#fb923c',
    content: `Three-Address Code (TAC) is a linearized form of the AST where each instruction has at most 3 operands.

TAC Format: result = arg1 op arg2

Example:
  IF cart_total > 5000 AND category = "Electronics" THEN discount = 20

Generated TAC:
  t1 = cart_total > 5000
  t2 = category = "Electronics"
  t3 = t1 AND t2
  IF NOT t3 GOTO end
  discount = 20

Rules:
• Temporary variables (t1, t2, ...) hold intermediate results
• Each binary expression creates one TAC instruction
• IF_FALSE instruction implements conditional execution
• ASSIGN instruction handles action targets`
  },
  {
    title: 'Code Optimization',
    tag: 'Phase 6',
    color: '#a78bfa',
    content: `Code optimization transforms the IR to improve performance while preserving semantics.

Optimization passes implemented (optimizer.js):

1. Constant Folding: evaluate constant expressions at compile time
   Before: t1 = 5 + 3   After: t1 = 8

2. Constant Propagation: substitute known constant values
   Before: t1 = 5; t2 = t1 > 3   After: t2 = 5 > 3

3. Copy Propagation: replace copies with originals
   Before: t1 = x; t2 = t1   After: t2 = x

4. Dead Temporary Elimination: remove temporaries never used
   Before: t1 = ...; (t1 never used)   After: (removed)

5. Redundant Instruction Elimination: remove duplicate assignments

6. Algebraic Simplification: x*1=x, x+0=x, x*0=0

Note: Most business rules don't benefit from optimization since identifiers (cart_total, category) 
are runtime values, not compile-time constants.`
  },
  {
    title: 'Target Code Generation',
    tag: 'Phase 7',
    color: '#34d399',
    content: `Target code generation translates the validated AST into executable JavaScript.

Translation rules:
• IF → if()
• AND → &&
• OR → ||
• NOT → !
• = (comparison) → ===
• != → !==
• All identifiers prefixed with ctx. to scope them
• Action assignments become ctx.target = value

Example output:
  function applyRule(ctx) {
    if ((ctx.cart_total > 5000 && ctx.category === "Electronics")) {
      ctx.discount = 20;
    }
  }

IMPORTANT: This code is shown for educational purposes only.
The actual execution uses a safe AST interpreter (Phase 8) — not eval() or new Function().`
  },
  {
    title: 'Safe Execution (AST Interpreter)',
    tag: 'Phase 8',
    color: '#f59e0b',
    content: `Safe execution evaluates the validated rule against the current shopping context WITHOUT using eval() or new Function().

Implementation (executor.js):
• evalNode() function recursively walks the AST
• Each node type has explicit handling
• Context is a plain object: { cart_total, quantity, category, ... }
• Only validated, compiled rules can be activated
• Rules that fail compilation cannot be executed

Safety guarantees:
• No arbitrary code execution
• Only supported operations can run
• Context cannot access external state
• Maximum supported operations bounded by grammar

Integration with shopping:
• CartContext.evaluateRules() runs all active rules against the cart
• Higher discount wins (best-discount policy)
• Lower shipping wins (free-shipping policy)
• Results apply to checkout subtotal, discount, and shipping fields`
  },
];

export default function ConceptsView() {
  const [open, setOpen] = useState(null);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1><BookOpen size={20} color="#818cf8" /> Compiler Concepts</h1>
          <p>Academic reference — all 8 phases explained with implementation details</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {CONCEPTS.map((c, i) => (
          <div key={i} className="concept-card">
            <button className="concept-header" onClick={() => setOpen(open === i ? null : i)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem' }}>
                <span className="concept-phase" style={{ background: c.color + '22', color: c.color }}>{c.tag}</span>
                <span className="concept-title">{c.title}</span>
              </div>
              {open === i ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
            </button>
            {open === i && (
              <div className="concept-body">
                <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', color: '#94a3b8', fontSize: '.875rem', lineHeight: 1.8 }}>
                  {c.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { margin-bottom: 1.5rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.4rem; display: flex; align-items: center; gap: .5rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .concept-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
        .concept-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: transparent; border: none; cursor: pointer; text-align: left; transition: background .15s; }
        .concept-header:hover { background: rgba(99,102,241,.05); }
        .concept-phase { padding: .25rem .625rem; border-radius: 100px; font-size: .72rem; font-weight: 700; letter-spacing: .04em; flex-shrink: 0; }
        .concept-title { font-size: .95rem; font-weight: 700; color: #f1f5f9; }
        .concept-body { padding: 1.25rem; border-top: 1px solid #334155; background: #0f172a; }
      `}</style>
    </div>
  );
}
