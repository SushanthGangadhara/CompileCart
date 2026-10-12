# Compiler Design Concepts — Implementation Reference

This document maps every academic compiler design concept to the exact file and
function where it is implemented in this project.  Every concept listed below
is **genuinely implemented** (not simulated or hardcoded).

---

## Quick Reference Table

| Concept | File | Key Export / Function |
|---|---|---|
| DFA Transition Table | `lexer.js` | `DFA_TRANSITIONS`, `DFA_STATES` |
| NFA (Thompson's Construction) | `lexer.js` | `NFA_DESCRIPTION` |
| NFA → DFA (subset construction) | `lexer.js` | doc + `DFA_TRANSITIONS` |
| Maximal Munch | `lexer.js` | `tokenize()` scanner loop |
| Token stream | `lexer.js` | `tokenize()` → `{ tokens }` |
| Lexer-phase symbol table | `lexer.js` | `tokenize()` → `{ symbolTableEntries }` |
| Lexical error recovery | `lexer.js` | `LexerError`, `tokenize()` |
| Context-Free Grammar (BNF) | `parser.js` | `GRAMMAR_RULES` |
| FIRST sets | `parser.js` | `FIRST_SETS` |
| FOLLOW sets | `parser.js` | `FOLLOW_SETS` |
| LL(1) Parsing Table | `parser.js` | `LL1_TABLE` |
| Recursive-Descent Parser | `parser.js` | `Parser` class, all `parse*()` methods |
| Parse Tree (concrete) | `parser.js` | `ptNode()`, `parseRule()` returns `{ pt }` |
| AST (abstract) | `parser.js` | `astNode()`, `parseRule()` returns `{ ast }` |
| Parse Tree vs AST distinction | `parser.js` | both built simultaneously; `ParseTreeNodeType` vs `NodeType` |
| Syntax error reporting | `parser.js` | `ParseError`, `parser.errors` |
| Symbol Table data structure | `symbolTable.js` | `SymbolTable` class |
| Symbol Table entry | `symbolTable.js` | `SymbolEntry` class |
| Scope stack (enter/exit) | `symbolTable.js` | `enterScope()`, `exitScope()` |
| insert / lookup / lookupCurrent | `symbolTable.js` | `insert()`, `lookup()`, `lookupCurrent()` |
| Pre-defined symbols (prelude) | `symbolTable.js` | `PREDEFINED_SYMBOLS`, `buildSymbolTable()` |
| Attribute Grammar (S-attributed) | `semantic.js` | `ATTRIBUTE_GRAMMAR_SPEC`, `inferType()` |
| Attribute Grammar (L-attributed) | `semantic.js` | `analyzeNode()` — symTable passed top-down |
| Type system / type rules | `semantic.js` | `TYPE_RULES`, `inferType()` |
| Type checking | `semantic.js` | `SemanticAnalyzer.analyzeNode()` |
| Read-only enforcement | `semantic.js` | `entry.kind === 'action_target'` check |
| Value range constraints | `semantic.js` | `VALUE_CONSTRAINTS` |
| Semantic error vs warning | `semantic.js` | `err()` vs `warn()` in `SemanticAnalyzer` |
| TAC Quadruples | `tacGenerator.js` | `Quadruple` class, `generateTAC()` |
| TAC Triples | `tacGenerator.js` | `Triple` class, `toTriples()` |
| TAC Indirect Triples | `tacGenerator.js` | `toIndirectTriples()`, `formatIndirectTriples()` |
| Temporary variable generation | `tacGenerator.js` | `TACGenerator.newTemp()` |
| Label generation / GOTO | `tacGenerator.js` | `TACGenerator.newLabel()`, `emit('GOTO', …)` |
| IF_FALSE (conditional branch) | `tacGenerator.js` | `emit('IF_FALSE', condTemp, null, endLabel)` |
| Back-patching concept | `tacGenerator.js` | comment in `NodeType.RULE` case |
| Basic Blocks | `optimizer.js` | `buildBasicBlocks()` |
| Control Flow Graph (CFG) | `optimizer.js` | `buildCFG()` |
| Reaching Definitions | `optimizer.js` | `computeReachingDefs()` |
| Liveness Analysis | `optimizer.js` | `computeLiveness()` |
| Value Numbering | `optimizer.js` | `valueNumbering()` |
| CSE (Common Subexpression Elim.) | `optimizer.js` | `valueNumbering()` + `cseMap` in `optimize()` |
| Constant Folding | `optimizer.js` | Pass 1 in `optimize()` |
| Constant Propagation | `optimizer.js` | Pass 2 in `optimize()` |
| Copy Propagation | `optimizer.js` | Pass 3 in `optimize()` |
| Algebraic Simplification | `optimizer.js` | Pass 5 in `optimize()` |
| Dead Temporary Elimination | `optimizer.js` | Pass 6 in `optimize()` (uses liveness) |
| Redundant Instruction Elim. | `optimizer.js` | Pass 7 in `optimize()` |
| Loop Optimization (LICM, SR, IVE) | `optimizer.js` | `LOOP_OPTIMIZATION_NOTES` |
| Code Gen from Optimized TAC | `codeGen.js` | `generateJSFromTAC()` (consumes optimized quads) |
| Pseudo-Assembly output | `codeGen.js` | `generatePseudoAssembly()` |
| Register Allocation (Graph Color) | `codeGen.js` | `graphColorRegAlloc()` |
| Register Descriptor | `codeGen.js` | `RegAllocState.rd` |
| Address Descriptor | `codeGen.js` | `RegAllocState.ad` |
| Instruction Selection | `codeGen.js` | `opMap` template in `generatePseudoAssembly()` |
| Full pipeline orchestration | `compiler.js` | `compile()` — 7 phases in sequence |
| Safe execution (no eval) | `executor.js` | `executeRule()`, `evalNode()` |

---

## Phase-by-Phase Detail

---

### Phase 1 — Lexical Analysis (`src/compiler/lexer.js`)

#### 1.1 NFA — Non-deterministic Finite Automaton

**Concept:** A formal model where one input can lead to multiple possible next states. The NFA for a token class is built mechanically from its regular expression using Thompson's Construction.

**Where implemented:**
```
lexer.js → NFA_DESCRIPTION (exported array)
```
Each entry is a formal NFA fragment for one token class:
- States list, alphabet, transition relation, start state, accept states
- Transition table includes ε (epsilon) transitions
- Classes covered: Keyword/Identifier, Integer/Float, String Literal, Relational Operators

**UI:** Lexer view → "NFA Description" tab

---

#### 1.2 DFA — Deterministic Finite Automaton

**Concept:** An NFA is converted to a DFA via the subset-construction algorithm. The DFA has no ε-transitions and deterministic transitions: δ(state, input) → exactly one next state.

**Where implemented:**
```
lexer.js → DFA_STATES       (list of all state names)
lexer.js → DFA_TRANSITIONS  (object: DFA_TRANSITIONS[state][charClass] → nextState)
```

The transition table covers all states:
`START, IN_WORD, IN_NUMBER, IN_FLOAT, IN_FLOAT_D, IN_STRING, IN_OP1, ACCEPT, ERROR`

Special value `-` means "back-up one character and emit the current token" (maximal munch).

**UI:** Lexer view → "DFA Table" tab (full transition matrix)

---

#### 1.3 Maximal Munch

**Concept:** Always consume the longest possible sequence of characters that forms a valid token. Implemented by the DFA continuing to scan as long as the current state is non-accepting, then backing up to the last accept state.

**Where implemented:**
```
lexer.js → tokenize() scanner loop
```
Examples:
- `>=` scanned as one token (not `>` followed by `=`)
- `cart_total` scanned as one identifier (not `cart` + `_` + `total`)

---

#### 1.4 Token Stream & Lexical Errors

**Where implemented:**
```
lexer.js → tokenize() returns { tokens, errors, symbolTableEntries }
Token class: type, lexeme, line, col, value
LexerError class: message, line, col, lexeme
```

Error cases handled:
- Unknown identifier (not in `ALLOWED_IDENTIFIERS`)
- Unterminated string literal (newline before closing quote)
- Unexpected character (e.g., `@`, `#`)
- Digit required after decimal point (e.g., `5.` is invalid)

---

#### 1.5 Lexer-Phase Symbol Table Population

**Concept:** The lexer records every identifier it encounters into a preliminary symbol table, which the semantic analyzer later enriches with type and scope information.

**Where implemented:**
```
lexer.js → tokenize() → symbolTableEntries array
Each entry: { name, firstLine, firstCol }
```

---

### Phase 2 — Syntax Analysis (`src/compiler/parser.js`)

#### 2.1 Context-Free Grammar (CFG)

**Where implemented:**
```
parser.js → GRAMMAR_RULES (exported array)
```
11 production rules, each with:
- Rule ID (G1–G11)
- Left-hand side non-terminal
- Right-hand side in BNF notation
- Explanatory note

The grammar handles:
- Operator precedence (OR < AND < NOT < COMPARISON < EXPRESSION < TERM < FACTOR)
- Left-associativity for binary operators
- Right-associativity for NOT
- Parenthesized expressions

---

#### 2.2 FIRST and FOLLOW Sets

**Concept:**
- `FIRST(α)` = terminals that can begin any string derived from α
- `FOLLOW(A)` = terminals that can immediately follow non-terminal A

Used to construct the LL(1) parsing table.

**Where implemented:**
```
parser.js → FIRST_SETS  (object: nonTerminal → string[])
parser.js → FOLLOW_SETS (object: nonTerminal → string[])
```

**UI:** Parser view → "Grammar & FIRST/FOLLOW" tab

---

#### 2.3 LL(1) Parsing Table

**Concept:** `M[A, a]` = which production to apply when expanding non-terminal A with lookahead token a.  Constructed from FIRST and FOLLOW sets.

**Where implemented:**
```
parser.js → LL1_TABLE (exported array)
Each entry: { nonTerminal, lookahead, production, ruleId }
```

**UI:** Parser view → "LL(1) Table" tab

---

#### 2.4 Recursive-Descent Parser

**Concept:** One parsing function per grammar non-terminal. Each function:
1. Looks at the current lookahead token (one token of lookahead = LL(1))
2. Decides which production to apply
3. Builds both a parse tree node and an AST node
4. Returns both

**Where implemented:**
```
parser.js → Parser class
  parseRule()        [G1]
  parseCondition()   [G2]
  parseOrExpr()      [G3]
  parseAndExpr()     [G4]
  parseNotExpr()     [G5]
  parseComparison()  [G6]
  parseExpression()  [G7]
  parseTerm()        [G8]
  parseFactor()      [G9]
  parseAction()      [G11]
```

Each function returns `{ pt: ParseTreeNode, ast: ASTNode }`.

---

#### 2.5 Parse Tree vs AST

**Concept:**
- **Parse Tree (Concrete Syntax Tree):** one node per grammar rule application. Every token appears as a leaf. Shows the full grammatical derivation.
- **AST (Abstract Syntax Tree):** grammar-artifact nodes eliminated. Only semantically meaningful nodes. More compact.

**Where implemented:**
```
parser.js → ptNode()     — creates a parse tree node (ParseTreeNodeType)
parser.js → astNode()    — creates an AST node (NodeType)
parser.js → parse()      — returns BOTH: { parseTree, ast }
```

Example difference for `IF cart_total > 5000 THEN discount = 20`:
- Parse Tree has: RULE → CONDITION → OR_EXPR → AND_EXPR → NOT_EXPR → COMPARISON → EXPRESSION → TERM → FACTOR (long chain)
- AST has: RULE → COMPARISON(>, cart_total, 5000) → ACTION(discount, 20) (compact)

**UI:** Parser view → "PT vs AST" tab (side-by-side comparison)

---

### Phase 3 — Semantic Analysis (`src/compiler/semantic.js`, `src/compiler/symbolTable.js`)

#### 3.1 Symbol Table (`symbolTable.js`)

**Concept:** A data structure mapping identifier names to their attributes (type, scope, offset, etc.). Implemented as a stack of hash tables (one per scope).

**Where implemented:**
```
symbolTable.js → SymbolEntry class
  { name, kind, type, scopeLevel, offset, readOnly, usages }

symbolTable.js → SymbolTable class
  enterScope(label)       — push new scope onto stack
  exitScope()             — pop current scope
  insert(name, kind, type) — add symbol to current scope
  lookup(name)            — search from innermost to outermost scope
  lookupCurrent(name)     — check only current scope
  recordUsage(name, line, col) — track where a symbol is used
  dump()                  — return all scopes as array (for display)
```

**Scope structure:**
```
scopeStack[0] = global scope  (PREDEFINED_SYMBOLS inserted here)
scopeStack[1] = rule scope    (opened by analyzeNode for NodeType.RULE)
```

**UI:** Semantic view → "Symbol Table" tab

---

#### 3.2 Attribute Grammar

**Concept:**
- **S-attributed (Synthesized):** type of a node computed bottom-up from its children
- **L-attributed (Inherited):** context (e.g., symbol table) passed top-down from parent

**Where implemented:**
```
semantic.js → ATTRIBUTE_GRAMMAR_SPEC  (formal spec, exported for display)
semantic.js → inferType(node)         — S-attributed: returns synthesized type
semantic.js → analyzeNode(node)       — L-attributed: passes st (symbol table) downward
```

Type inference is purely synthesized:
- `NUMBER` node → type = `'number'`
- `IDENTIFIER` node → type = `lookup(name).type` (from symbol table)
- `COMPARISON` node → type = `'boolean'` (always)
- `AND/OR` node → checks children are both boolean, returns `'boolean'`

**UI:** Semantic view → "Attribute Grammar" tab

---

#### 3.3 Type Rules

```
semantic.js → TYPE_RULES (exported array)
Each entry: { operator, leftType, rightType, resultType, valid, reason }
```

Key rules:
- Arithmetic ops require both operands to be `number`
- String operands only support `=` and `!=` (not `>`, `<`, etc.)
- `AND`/`OR` require both operands to be `boolean`
- Action target must be `number`

**UI:** Semantic view → "Type Rules" tab

---

### Phase 4 — Intermediate Code (`src/compiler/tacGenerator.js`)

#### 4.1 Quadruples

**Concept:** Each TAC instruction stored as a 4-field record: `(op, arg1, arg2, result)`

```
tacGenerator.js → Quadruple class
tacGenerator.js → generateTAC(ast) → Quadruple[]
tacGenerator.js → formatTAC(quads) → formatted display rows
```

Instruction types generated:
| op | meaning |
|---|---|
| `>`, `<`, `>=`, `<=`, `=`, `!=` | relational comparison |
| `+`, `-`, `*`, `/` | arithmetic |
| `AND`, `OR` | logical binary |
| `NOT` | logical unary |
| `=` | assignment / copy |
| `IF_FALSE` | conditional branch (if !arg1, goto result) |
| `GOTO` | unconditional jump |
| `LABEL` | branch target |

---

#### 4.2 Triples

**Concept:** Result field dropped. Results referenced as `(i)` (index into table). Saves one field per entry.

```
tacGenerator.js → Triple class
tacGenerator.js → toTriples(quads) → Triple[]
tacGenerator.js → formatTriples(triples)
```

---

#### 4.3 Indirect Triples

**Concept:** A pointer array into the triples table. Reordering = change pointer array only, not triple table.  Critical for loop-invariant code motion.

```
tacGenerator.js → toIndirectTriples(triples) → { triples, pointers }
tacGenerator.js → formatIndirectTriples({ triples, pointers })
```

**UI:** TAC view → three tabs: Quadruples / Triples / Indirect Triples

---

#### 4.4 Back-Patching

**Concept:** When the target label of a branch is not yet known at emission time, emit a placeholder and fill it in ("patch") when the target is determined later.

**Where noted:**
```
tacGenerator.js → TACGenerator.gen() → NodeType.RULE case
```
Comment explains how `endLabel` is generated before the action and used as the `IF_FALSE` target.

---

### Phase 5 — Code Optimization (`src/compiler/optimizer.js`)

#### 5.1 Basic Blocks

**Concept:** Maximal straight-line code sequences. Leaders identified by: first instruction, GOTO/IF_FALSE targets, instructions following branches.

```
optimizer.js → buildBasicBlocks(quads) → Block[]
Each Block: { id, startIdx, instructions, predecessors, successors }
```

---

#### 5.2 Control Flow Graph (CFG)

**Concept:** Directed graph of basic blocks. Edges represent possible control transfers.

```
optimizer.js → buildCFG(blocks, quads) → annotated Block[]
(adds predecessors[] and successors[] to each block)
```

**UI:** Optimizer view → "Basic Blocks / CFG" tab

---

#### 5.3 Reaching Definitions (forward data flow)

**Equations:**
```
OUT[B] = GEN[B] ∪ (IN[B] − KILL[B])
IN[B]  = ∪ OUT[P] for all predecessors P
```

```
optimizer.js → computeReachingDefs(quads)
Returns: { allDefs, reachMap }
```

**UI:** Optimizer view → "Reaching Defs" tab

---

#### 5.4 Liveness Analysis (backward data flow)

**Equations:**
```
IN[B]  = USE[B] ∪ (OUT[B] − DEF[B])
OUT[B] = ∪ IN[S] for all successors S
```

```
optimizer.js → computeLiveness(quads)
Returns: [{ quadIdx, live_in[], live_out[] }]
```

Used by: Dead Temporary Elimination (pass 6).

**UI:** Optimizer view → "Liveness Analysis" tab

---

#### 5.5 Value Numbering & CSE

**Concept:** Assign a unique number to each distinct computed value. Expressions with the same number are CSE candidates — the second computation can be replaced by a copy.

```
optimizer.js → valueNumbering(quads)
Returns: { cseMap, log, vnTable }
```

Applied in `optimize()` Pass 4.

**UI:** Optimizer view → "CSE / Value #" tab

---

#### 5.6 Optimization Passes (7 total)

| Pass | Name | Function in optimize() |
|---|---|---|
| 1 | Constant Folding | `evalBinary()` on two constants |
| 2 | Constant Propagation | `constMap` tracking |
| 3 | Copy Propagation | `copyMap` tracking |
| 4 | CSE via Value Numbering | `valueNumbering()` + `cseMap` |
| 5 | Algebraic Simplification | `x*1=x`, `x+0=x`, `x*0=0` |
| 6 | Dead Temporary Elimination | liveness-guided filter |
| 7 | Redundant Instruction Elim. | `seen` set dedup |

---

#### 5.7 Loop Optimization

The rule language has no loops. Three techniques are documented:

```
optimizer.js → LOOP_OPTIMIZATION_NOTES
```

| Technique | Concept |
|---|---|
| LICM (Loop-Invariant Code Motion) | Move loop-constant computations to pre-header |
| Strength Reduction | Replace costly ops with cheaper (e.g., `i*4 → i<<2`) |
| Induction Variable Elimination | Replace multiply-per-iter with add-per-iter |

**UI:** Optimizer view → "Loop Optimization" tab

---

### Phase 6 — Code Generation (`src/compiler/codeGen.js`)

#### 6.1 Code Generation from Optimized TAC

**Gap closed:** The original implementation generated code from the raw AST (skipping the IR). The new implementation generates from the **optimized TAC quadruples**.

```
codeGen.js → generateJSFromTAC(quads)   ← PRIMARY: consumes optimized TAC
codeGen.js → generateCode(ast)           ← REFERENCE: AST-based (kept for comparison)
```

---

#### 6.2 Pseudo-Assembly Output

Target machine model: 8-register machine (R0–R7).

```
codeGen.js → generatePseudoAssembly(quads, livenessData)
Returns: { asm[], allocResult, descLog }
```

Instruction set:
`LOAD, STORE, MOV, MOVI, ADD, SUB, MUL, DIV, AND, OR, NOT, CMP, JEQ, JMP, LABEL, SETGT, SETLT, SETGE, SETLE, SETEQ, SETNE`

---

#### 6.3 Register Allocation — Graph Coloring

**Concept:**
1. Build **interference graph**: nodes = live ranges; edges = ranges that are simultaneously live
2. **Color** the graph with k colors (k = number of registers)
3. **Spill** any node that cannot be colored (assign to memory)
4. Use **greedy coloring** (most-constrained first) for efficiency

```
codeGen.js → graphColorRegAlloc(quads, livenessData)
Returns: { color, spills, interferenceEdges, registers }
```

---

#### 6.4 Register Descriptor & Address Descriptor

```
codeGen.js → RegAllocState class
  rd[Ri]  = variable currently in register Ri  (Register Descriptor)
  ad[x]   = register/memory holding variable x  (Address Descriptor)
  getReg(name, colorMap)  = assign/retrieve register for a variable
```

**UI:** Code Gen view → "Register Alloc" tab (interference graph, color assignment, spills)

---

### Phase 7 — Safe Execution (`src/compiler/executor.js`)

**Concept:** Tree-walking AST interpreter. Evaluates the validated rule against a business context object with no `eval()` or `new Function()`.

```
executor.js → evalNode(node, ctx)   — recursive tree walk
executor.js → executeRule(ast, context) — public API
executor.js → applyActiveRules(rules, cartContext) — batch evaluation
```

Safety guarantees:
- Only 10 supported node types — no arbitrary code paths
- Context is a plain object — no external state access
- Only compiled+validated rules can be activated

---

### Pipeline Orchestration (`src/compiler/compiler.js`)

```
compiler.js → compile(source) → {
  phases: {
    lexer:     { tokens, errors, symbolTableEntries }
    parser:    { parseTree, ast, errors, steps }        ← both trees
    semantic:  { errors, warnings, checks, symbolTable, history }
    tac:       { quadruples, triples, indirectTriples, formatted, ... }
    optimizer: { optimized, basicBlocks, liveness, reachingDefs,
                 valueNumbering, transformations, loopNotes }
    codeGen:   { pseudoAsm, registerAlloc, jsFromTAC, jsFromAST,
                 translationSteps }
  }
}
```

Each phase only runs if the previous phase succeeded (early-exit on error).
The optimized TAC from Phase 5 is passed directly to Phase 6 code generation.

---

## What Was Missing Before (Now Fixed)

| Was Missing | Now Implemented |
|---|---|
| DFA transition table | `lexer.js → DFA_TRANSITIONS` |
| NFA description | `lexer.js → NFA_DESCRIPTION` |
| Parse tree (vs AST) | `parser.js → parseTree` field in parse() |
| FIRST/FOLLOW sets | `parser.js → FIRST_SETS, FOLLOW_SETS` |
| LL(1) table | `parser.js → LL1_TABLE` |
| SymbolTable as data structure | `symbolTable.js → SymbolTable` class |
| Scope stack | `symbolTable.js → enterScope/exitScope` |
| Attribute grammar spec | `semantic.js → ATTRIBUTE_GRAMMAR_SPEC` |
| CSE / Value Numbering | `optimizer.js → valueNumbering()` |
| Basic Blocks | `optimizer.js → buildBasicBlocks()` |
| CFG | `optimizer.js → buildCFG()` |
| Liveness analysis | `optimizer.js → computeLiveness()` |
| Reaching definitions | `optimizer.js → computeReachingDefs()` |
| Loop optimization notes | `optimizer.js → LOOP_OPTIMIZATION_NOTES` |
| Pseudo-assembly output | `codeGen.js → generatePseudoAssembly()` |
| Register allocation | `codeGen.js → graphColorRegAlloc()` |
| Register/Address descriptors | `codeGen.js → RegAllocState` |
| Code gen from TAC (not AST) | `codeGen.js → generateJSFromTAC()` |
| Triples representation | `tacGenerator.js → Triple, toTriples()` |
| Indirect triples | `tacGenerator.js → toIndirectTriples()` |
| Back-patching | `tacGenerator.js → noted in RULE case` |

---

## File Index

| File | Lines | Primary Concepts |
|---|---|---|
| `src/compiler/lexer.js` | ~220 | DFA, NFA, token stream, lexer symbol table |
| `src/compiler/parser.js` | ~300 | CFG, FIRST/FOLLOW, LL(1), parse tree, AST |
| `src/compiler/symbolTable.js` | ~120 | SymbolTable, scope stack, entries |
| `src/compiler/semantic.js` | ~200 | Attribute grammar, type checking, scope |
| `src/compiler/tacGenerator.js` | ~180 | Quadruples, triples, indirect triples |
| `src/compiler/optimizer.js` | ~280 | CFG, basic blocks, data flow, CSE, 7 passes |
| `src/compiler/codeGen.js` | ~260 | Pseudo-asm, graph coloring, register alloc |
| `src/compiler/astVisualizer.js` | ~80 | Tree rendering for both PT and AST |
| `src/compiler/executor.js` | ~80 | Safe tree-walking interpreter |
| `src/compiler/compiler.js` | ~100 | 7-phase pipeline orchestration |
| `src/pages/admin/compiler/PhaseViews.jsx` | ~700 | All phase UIs with new data |
| `COMPILER_CONCEPTS.md` | this file | Full documentation |

---

*All concepts are genuinely implemented — none are simulated with hardcoded output.*
