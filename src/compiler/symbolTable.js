/**
 * ============================================================
 * symbolTable.js — Symbol Table Data Structure
 * ============================================================
 *
 * CONCEPTS COVERED:
 *  1. Symbol Table as a Hash-Table-based data structure
 *  2. Scope Stack (linked list of scopes — enterScope/exitScope)
 *  3. Symbol entry: name, type, scope level, offset, value
 *  4. insert() — add a symbol to the current scope
 *  5. lookup() — search current scope then outer scopes (chain)
 *  6. lookupCurrent() — check only the current scope
 *  7. Scope annotation used during semantic analysis
 *
 * DOCUMENTATION:
 *  File    : src/compiler/symbolTable.js
 *  Used by : semantic.js (Phase 3)
 *            compiler.js (shared across phases)
 *  Exports : SymbolTable, SymbolEntry, PREDEFINED_SYMBOLS
 * ============================================================
 */

// ─── Symbol Entry ─────────────────────────────────────────────────────────────
/**
 * CONCEPT: Symbol Table Entry
 *
 * Each entry in the symbol table stores everything a compiler needs
 * to know about a name:
 *   name       — the identifier string
 *   kind       — 'variable' | 'keyword' | 'action_target'
 *   type       — 'number' | 'string' | 'boolean' | 'unknown'
 *   scopeLevel — nesting depth (0 = global)
 *   offset     — conceptual memory offset in the activation record
 *   readOnly   — true if the identifier cannot be assigned to
 *   usages     — list of { line, col } where this symbol was referenced
 */
export class SymbolEntry {
  constructor({ name, kind, type, scopeLevel = 0, offset = 0, readOnly = false, initialValue = null }) {
    this.name         = name;
    this.kind         = kind;          // 'variable' | 'action_target' | 'keyword'
    this.type         = type;          // 'number' | 'string' | 'boolean'
    this.scopeLevel   = scopeLevel;
    this.offset       = offset;        // conceptual word offset
    this.readOnly     = readOnly;
    this.initialValue = initialValue;
    this.usages       = [];            // [{line, col}]
  }

  addUsage(line, col) {
    this.usages.push({ line, col });
  }

  toString() {
    return `${this.name} : ${this.type} [${this.kind}, scope=${this.scopeLevel}, offset=${this.offset}]`;
  }
}

// ─── SymbolTable ──────────────────────────────────────────────────────────────
/**
 * CONCEPT: Symbol Table with Scope Stack
 *
 * The table is a stack of scopes.  Each scope is a Map<string, SymbolEntry>.
 * When we enter a new scope (e.g., an inner block), we push a new Map.
 * When we leave, we pop it.
 *
 *   scopeStack[0]  — global scope
 *   scopeStack[1]  — first nested scope
 *   scopeStack[k]  — current (innermost) scope
 *
 * lookup() walks from innermost to outermost — this implements lexical
 * (static) scoping, matching the behaviour of most programming languages.
 */
export class SymbolTable {
  constructor() {
    this.scopeStack  = [new Map()];  // start with global scope
    this.scopeLevel  = 0;
    this.nextOffset  = 0;
    this.history     = [];           // audit log of all operations
  }

  // Current (innermost) scope
  get currentScope() { return this.scopeStack[this.scopeStack.length - 1]; }

  // ── Enter a new nested scope ────────────────────────────────────────────────
  enterScope(label = '') {
    this.scopeStack.push(new Map());
    this.scopeLevel++;
    this.history.push({ op: 'ENTER_SCOPE', level: this.scopeLevel, label });
    return this.scopeLevel;
  }

  // ── Exit the current scope (pop it) ────────────────────────────────────────
  exitScope() {
    if (this.scopeStack.length <= 1) {
      throw new Error('Cannot exit global scope');
    }
    const popped = this.scopeStack.pop();
    this.history.push({ op: 'EXIT_SCOPE', level: this.scopeLevel, symbols: [...popped.keys()] });
    this.scopeLevel--;
  }

  // ── Insert a symbol into the current scope ──────────────────────────────────
  insert(name, kind, type, { readOnly = false, initialValue = null } = {}) {
    if (this.currentScope.has(name)) {
      return { success: false, error: `'${name}' already declared in this scope` };
    }
    const entry = new SymbolEntry({
      name, kind, type,
      scopeLevel : this.scopeLevel,
      offset     : this.nextOffset++,
      readOnly,
      initialValue,
    });
    this.currentScope.set(name, entry);
    this.history.push({ op: 'INSERT', name, type, kind, level: this.scopeLevel, offset: entry.offset });
    return { success: true, entry };
  }

  // ── Lookup — search from innermost to outermost scope ──────────────────────
  lookup(name) {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      if (this.scopeStack[i].has(name)) {
        const entry = this.scopeStack[i].get(name);
        this.history.push({ op: 'LOOKUP', name, found: true, level: i });
        return entry;
      }
    }
    this.history.push({ op: 'LOOKUP', name, found: false });
    return null;
  }

  // ── Lookup only in the current scope ───────────────────────────────────────
  lookupCurrent(name) {
    return this.currentScope.get(name) || null;
  }

  // ── Record a usage of a symbol ──────────────────────────────────────────────
  recordUsage(name, line, col) {
    const entry = this.lookup(name);
    if (entry) entry.addUsage(line, col);
  }

  // ── Dump all scopes for display ─────────────────────────────────────────────
  dump() {
    return this.scopeStack.map((scope, level) => ({
      level,
      label   : level === 0 ? 'global' : `scope_${level}`,
      symbols : [...scope.values()].map(e => ({
        name       : e.name,
        kind       : e.kind,
        type       : e.type,
        offset     : e.offset,
        readOnly   : e.readOnly,
        usages     : e.usages.length,
        scopeLevel : e.scopeLevel,
      })),
    }));
  }
}

// ─── Pre-defined (built-in) symbols ─────────────────────────────────────────
/**
 * All valid identifiers for the business rule language,
 * pre-loaded into the global scope by the semantic analyzer.
 *
 * In a general compiler these would come from import declarations
 * or a language prelude.  Here they are the "runtime API" of the
 * e-commerce context object that rules evaluate against.
 */
export const PREDEFINED_SYMBOLS = [
  // Condition variables (read-only in rules)
  { name: 'cart_total',    kind: 'variable', type: 'number',  readOnly: true,  initialValue: 0     },
  { name: 'quantity',      kind: 'variable', type: 'number',  readOnly: true,  initialValue: 0     },
  { name: 'category',      kind: 'variable', type: 'string',  readOnly: true,  initialValue: ''    },
  { name: 'customer_type', kind: 'variable', type: 'string',  readOnly: true,  initialValue: ''    },
  { name: 'coupon',        kind: 'variable', type: 'string',  readOnly: true,  initialValue: ''    },
  { name: 'stock',         kind: 'variable', type: 'number',  readOnly: true,  initialValue: 0     },
  // Action targets (write-only in THEN clause)
  { name: 'discount',      kind: 'action_target', type: 'number', readOnly: false, initialValue: 0 },
  { name: 'shipping',      kind: 'action_target', type: 'number', readOnly: false, initialValue: 100 },
  { name: 'price',         kind: 'action_target', type: 'number', readOnly: false, initialValue: null },
];

// ─── Factory: build a pre-populated SymbolTable ───────────────────────────────
export function buildSymbolTable() {
  const st = new SymbolTable();
  // Populate global scope (scope level 0)
  for (const sym of PREDEFINED_SYMBOLS) {
    st.insert(sym.name, sym.kind, sym.type, {
      readOnly     : sym.readOnly,
      initialValue : sym.initialValue,
    });
  }
  return st;
}
