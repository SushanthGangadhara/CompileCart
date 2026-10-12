/**
 * ============================================================
 * semantic.js — Phase 3: Semantic Analysis
 * ============================================================
 *
 * CONCEPTS COVERED:
 *  1. Attribute Grammars — S-attributed and L-attributed
 *  2. Synthesized Attributes — values flow bottom-up (type inference)
 *  3. Inherited Attributes — values flow top-down (context passing)
 *  4. Type System — type checking with a flat type lattice
 *  5. Scope Analysis — identifier resolution via SymbolTable
 *  6. Read-only enforcement — condition vars cannot be assigned
 *  7. Semantic error vs warning distinction
 *  8. Operator type-compatibility rules
 *
 * DOCUMENTATION:
 *  File    : src/compiler/semantic.js
 *  Depends : parser.js (NodeType), symbolTable.js (SymbolTable)
 *  Used by : compiler.js (Phase 3 step)
 *  Exports : analyze(), SemanticError, ATTRIBUTE_GRAMMAR_SPEC,
 *            TYPE_RULES, VALUE_CONSTRAINTS
 * ============================================================
 */

import { NodeType }       from './parser';
import { buildSymbolTable } from './symbolTable';

// ─── Semantic Error ───────────────────────────────────────────────────────────
export class SemanticError {
  constructor(message, line = null, col = null) {
    this.message = message;
    this.line    = line;
    this.col     = col;
  }
  toString() {
    const loc = this.line ? ` at line ${this.line}, col ${this.col}` : '';
    return `Semantic Error${loc}: ${this.message}`;
  }
}

// ─── Attribute Grammar Specification ─────────────────────────────────────────
/**
 * CONCEPT: Attribute Grammar
 *
 * An attribute grammar extends a CFG by associating "attributes"
 * with grammar symbols and "semantic rules" that compute them.
 *
 * Two kinds:
 *   S-attributed (Synthesized): attribute value comes from children
 *   L-attributed (Inherited):   attribute value comes from parent or
 *                                left siblings
 *
 * We use S-attributed rules for type inference (type flows up from
 * leaves to root) and L-attributed rules for scope context (the
 * current SymbolTable propagates downward through the tree).
 */
export const ATTRIBUTE_GRAMMAR_SPEC = [
  {
    kind         : 'Synthesized',
    nonTerminal  : 'FACTOR',
    attribute    : 'type',
    rule         : 'FACTOR.type = typeof(literal)  or  lookup(IDENTIFIER).type',
    explanation  : 'Leaf nodes synthesize their type from their literal value or from the symbol table lookup.',
  },
  {
    kind         : 'Synthesized',
    nonTerminal  : 'EXPRESSION',
    attribute    : 'type',
    rule         : 'EXPRESSION.type = TERM.type  (must be consistent for all TERMs)',
    explanation  : 'An EXPRESSION inherits the type from its constituent TERMs; all TERMs must agree.',
  },
  {
    kind         : 'Synthesized',
    nonTerminal  : 'COMPARISON',
    attribute    : 'type',
    rule         : 'COMPARISON.type = boolean  (always produces a boolean)',
    explanation  : 'A comparison always yields boolean regardless of operand types.',
  },
  {
    kind         : 'Synthesized',
    nonTerminal  : 'AND_EXPR / OR_EXPR',
    attribute    : 'type',
    rule         : 'type = boolean  if  left.type == boolean && right.type == boolean',
    explanation  : 'Logical AND/OR require boolean operands and produce boolean.',
  },
  {
    kind         : 'Inherited',
    nonTerminal  : 'CONDITION / ACTION',
    attribute    : 'symTable',
    rule         : 'CONDITION.symTable = RULE.symTable',
    explanation  : 'The symbol table is passed (inherited) top-down from RULE to all sub-trees.',
  },
  {
    kind         : 'Synthesized',
    nonTerminal  : 'ACTION',
    attribute    : 'targetType',
    rule         : "ACTION.targetType = lookup(IDENTIFIER).type  (must be 'number')",
    explanation  : 'The action target must be a declared action_target symbol of numeric type.',
  },
];

// ─── Type rules ───────────────────────────────────────────────────────────────
/**
 * CONCEPT: Type Rules (inference and checking)
 *
 * Defines which operator is compatible with which types.
 * Written as Γ ⊢ e : τ  (judgment: in environment Γ, expression e has type τ)
 */
export const TYPE_RULES = [
  { operator: '+,-,*,/',  leftType: 'number',  rightType: 'number',  resultType: 'number',  valid: true  },
  { operator: '>',        leftType: 'number',  rightType: 'number',  resultType: 'boolean', valid: true  },
  { operator: '<',        leftType: 'number',  rightType: 'number',  resultType: 'boolean', valid: true  },
  { operator: '>=',       leftType: 'number',  rightType: 'number',  resultType: 'boolean', valid: true  },
  { operator: '<=',       leftType: 'number',  rightType: 'number',  resultType: 'boolean', valid: true  },
  { operator: '=',        leftType: 'number',  rightType: 'number',  resultType: 'boolean', valid: true  },
  { operator: '=',        leftType: 'string',  rightType: 'string',  resultType: 'boolean', valid: true  },
  { operator: '=',        leftType: 'boolean', rightType: 'boolean', resultType: 'boolean', valid: true  },
  { operator: '!=',       leftType: 'number',  rightType: 'number',  resultType: 'boolean', valid: true  },
  { operator: '!=',       leftType: 'string',  rightType: 'string',  resultType: 'boolean', valid: true  },
  { operator: '>,<,>=,<=',leftType: 'string',  rightType: 'any',     resultType: 'error',   valid: false,
    reason: 'Relational ordering is undefined for strings; use = or != only.' },
  { operator: '+,-,*,/',  leftType: 'string',  rightType: 'any',     resultType: 'error',   valid: false,
    reason: 'Arithmetic on strings is not supported.' },
  { operator: 'AND,OR',   leftType: 'boolean', rightType: 'boolean', resultType: 'boolean', valid: true  },
  { operator: 'AND,OR',   leftType: '!boolean',rightType: 'any',     resultType: 'error',   valid: false,
    reason: 'AND/OR operands must both be boolean.' },
  { operator: 'NOT',      leftType: 'boolean', rightType: 'n/a',     resultType: 'boolean', valid: true  },
];

// ─── Value constraints ────────────────────────────────────────────────────────
export const VALUE_CONSTRAINTS = {
  discount  : { min: 0,   max: 100,       unit: '%'   },
  shipping  : { min: 0,   max: 10000,     unit: '₹'   },
  price     : { min: 0,   max: 10000000,  unit: '₹'   },
  cart_total: { min: 0,   max: 10000000,  unit: '₹'   },
  quantity  : { min: 0,   max: 10000,     unit: 'qty' },
  stock     : { min: 0,   max: 100000,    unit: 'qty' },
};

// ─── Semantic Analyzer ────────────────────────────────────────────────────────
class SemanticAnalyzer {
  constructor(symbolTable) {
    this.st       = symbolTable;
    this.errors   = [];
    this.warnings = [];
    this.checks   = [];   // audit trace for UI display
  }

  err (msg, line, col) { this.errors.push(new SemanticError(msg, line, col)); this.checks.push(`❌ ${msg}`); }
  warn(msg)            { this.warnings.push(msg);                              this.checks.push(`⚠️  ${msg}`); }
  ok  (msg)            {                                                        this.checks.push(`✅ ${msg}`); }

  // ── S-attributed: infer type of expression node ───────────────────────────
  // This is a bottom-up synthesized attribute computation.
  inferType(node) {
    if (!node) return 'unknown';
    switch (node.type) {
      case NodeType.NUMBER:     return 'number';
      case NodeType.STRING:     return 'string';
      case NodeType.BOOLEAN:    return 'boolean';

      case NodeType.IDENTIFIER: {
        // L-attributed: we pass the inherited symTable context downward
        const entry = this.st.lookup(node.name);
        if (!entry) {
          this.err(`Undeclared identifier '${node.name}'`, node.token?.line, node.token?.col);
          return 'unknown';
        }
        this.st.recordUsage(node.name, node.token?.line, node.token?.col);
        return entry.type;
      }

      case NodeType.BINARY_OP: {
        const lt = this.inferType(node.left);
        const rt = this.inferType(node.right);
        if (lt !== 'number' || rt !== 'number') {
          this.err(`Arithmetic operator '${node.operator}' requires numeric operands, got '${lt}' and '${rt}'`);
          return 'unknown';
        }
        return 'number';
      }

      case NodeType.COMPARISON:
        return 'boolean';   // synthesized — comparison always yields boolean

      case NodeType.AND:
      case NodeType.OR: {
        const lt = this.inferType(node.left);
        const rt = this.inferType(node.right);
        if (lt !== 'boolean') this.err(`Left side of ${node.type} must be boolean, got '${lt}'`);
        if (rt !== 'boolean') this.err(`Right side of ${node.type} must be boolean, got '${rt}'`);
        return 'boolean';
      }

      case NodeType.NOT: {
        const ot = this.inferType(node.operand);
        if (ot !== 'boolean') this.err(`NOT operand must be boolean, got '${ot}'`);
        return 'boolean';
      }

      default: return 'unknown';
    }
  }

  // ── Analyze a node (full semantic walk) ──────────────────────────────────
  analyzeNode(node) {
    if (!node) return;

    switch (node.type) {

      case NodeType.RULE:
        this.checks.push('── Entering RULE scope (inherited symTable passed to children) ──');
        // L-attributed: symbol table scope opened for rule body
        this.st.enterScope('rule');
        this.analyzeNode(node.condition);
        this.analyzeAction(node.action);
        this.st.exitScope();
        this.ok('RULE structure valid (IF … THEN …)');
        break;

      case NodeType.AND:
      case NodeType.OR: {
        const lt = this.inferType(node.left);
        const rt = this.inferType(node.right);
        if (lt === 'boolean') this.ok(`${node.type} left operand is boolean`);
        if (rt === 'boolean') this.ok(`${node.type} right operand is boolean`);
        this.analyzeNode(node.left);
        this.analyzeNode(node.right);
        break;
      }

      case NodeType.NOT:
        this.analyzeNode(node.operand);
        break;

      case NodeType.COMPARISON: {
        const lt = this.inferType(node.left);
        const rt = this.inferType(node.right);
        this.checks.push(`  Checking comparison: ${lt} ${node.operator} ${rt}`);

        // Type compatibility
        if (lt !== rt && lt !== 'unknown' && rt !== 'unknown') {
          this.err(
            `Type mismatch in comparison: cannot compare '${lt}' with '${rt}' using '${node.operator}'`,
            node.op?.line, node.op?.col);
        } else {
          this.ok(`Comparison types compatible: ${lt} ${node.operator} ${rt}`);
        }

        // String ordering restriction
        if ((lt === 'string' || rt === 'string') && !['=','!='].includes(node.operator)) {
          this.err(
            `Operator '${node.operator}' not allowed for string type. Use '=' or '!='`,
            node.op?.line, node.op?.col);
        }

        // Numeric range check on literal comparands
        if (node.left.type === NodeType.IDENTIFIER && node.right.type === NodeType.NUMBER) {
          const c = VALUE_CONSTRAINTS[node.left.name];
          const v = node.right.value;
          if (c && (v < c.min || v > c.max)) {
            this.warn(`Value ${v} for '${node.left.name}' is outside expected range [${c.min}, ${c.max}]`);
          }
        }

        this.analyzeNode(node.left);
        this.analyzeNode(node.right);
        break;
      }

      case NodeType.IDENTIFIER: {
        const entry = this.st.lookup(node.name);
        if (!entry) {
          this.err(`Undefined identifier '${node.name}'`, node.token?.line, node.token?.col);
        } else {
          this.ok(`Identifier '${node.name}' resolved → type: ${entry.type}, scope: ${entry.scopeLevel}`);
        }
        break;
      }

      case NodeType.BINARY_OP:
        this.analyzeNode(node.left);
        this.analyzeNode(node.right);
        break;

      default:
        break;
    }
  }

  // ── Validate the THEN action clause ────────────────────────────────────────
  analyzeAction(action) {
    if (!action) { this.err('Missing THEN action'); return; }
    this.checks.push(`  Checking action: ${action.target} = <expr>`);

    // Resolve action target from symbol table
    const entry = this.st.lookup(action.target);
    if (!entry) {
      this.err(`'${action.target}' is not declared. Valid action targets: discount, shipping, price`);
      return;
    }
    if (entry.kind !== 'action_target') {
      this.err(`'${action.target}' is a read-only condition variable; it cannot be assigned to`);
      return;
    }
    this.ok(`Action target '${action.target}' is a declared action_target (type: ${entry.type})`);

    // The assigned value must be numeric
    const vt = this.inferType(action.value);
    if (vt !== 'number') {
      this.err(`Action value must be numeric, got '${vt}'`);
      return;
    }
    this.ok('Action value type is numeric ✓');

    // Range check on constant action values
    if (action.value.type === NodeType.NUMBER) {
      const c = VALUE_CONSTRAINTS[action.target];
      const v = action.value.value;
      if (c && (v < c.min || v > c.max)) {
        this.err(
          `Value ${v} for '${action.target}' is out of valid range [${c.min}, ${c.max}] ${c.unit}`);
        return;
      }
      this.ok(`Action value ${v} is within valid range for '${action.target}' [${c?.min}, ${c?.max}]`);
    }
  }

  analyze(ast) {
    this.analyzeNode(ast);
    return {
      errors      : this.errors,
      warnings    : this.warnings,
      checks      : this.checks,
      symbolTable : this.st.dump(),
      history     : this.st.history,
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function analyze(ast) {
  const st       = buildSymbolTable();
  const analyzer = new SemanticAnalyzer(st);
  return analyzer.analyze(ast);
}
