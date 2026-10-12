/**
 * ============================================================
 * tacGenerator.js — Phase 4: Intermediate Code Generation
 * ============================================================
 *
 * CONCEPTS COVERED:
 *  1. Three-Address Code (TAC) — one operator, ≤3 addresses
 *  2. Quadruples  — (op, arg1, arg2, result)  — explicit result field
 *  3. Triples     — (op, arg1, arg2)           — result implicit by position
 *  4. Indirect Triples — pointer array into triples table (enables reordering)
 *  5. Temporary variable generation (t1, t2, …)
 *  6. Label generation for conditional branches (L0, L1, …)
 *  7. Proper IF_FALSE / GOTO control-flow instructions
 *  8. Back-patching concept (noted in comments)
 *
 * DOCUMENTATION:
 *  File    : src/compiler/tacGenerator.js
 *  Depends : parser.js (NodeType)
 *  Used by : compiler.js (Phase 4 step)
 *            optimizer.js (input instruction list)
 *  Exports : generateTAC(), formatTAC(), formatTriples(),
 *            formatIndirectTriples(), Quadruple, Triple
 * ============================================================
 */

import { NodeType } from './parser';

// ─── Quadruple ────────────────────────────────────────────────────────────────
/**
 * CONCEPT: Quadruple representation
 *
 * Each TAC instruction is stored as a 4-field record:
 *   (op, arg1, arg2, result)
 *
 * Examples:
 *   ('+',  'a', 'b',  't1')   →  t1 = a + b
 *   ('>',  't1','5000','t2')  →  t2 = t1 > 5000
 *   ('=',  '20', null, 'd')   →  d  = 20          (copy / assignment)
 *   ('IF_FALSE', 't3', null, 'L1')  →  if !t3 goto L1
 *   ('GOTO', null, null, 'L2')      →  goto L2
 *   ('LABEL', 'L1', null, null)     →  L1:
 */
export class Quadruple {
  constructor(op, arg1, arg2, result, comment = '') {
    this.op      = op;
    this.arg1    = arg1    ?? null;
    this.arg2    = arg2    ?? null;
    this.result  = result  ?? null;
    this.comment = comment;
  }

  format() {
    if (this.op === 'LABEL')    return `${this.result}:`;
    if (this.op === 'GOTO')     return `goto ${this.result}`;
    if (this.op === 'IF_FALSE') return `if_false ${this.arg1} goto ${this.result}`;
    if (this.op === 'NOT')      return `${this.result} = NOT ${this.arg1}`;
    if (this.op === '=')        return `${this.result} = ${this.arg1}`;
    if (this.arg2 !== null)     return `${this.result} = ${this.arg1} ${this.op} ${this.arg2}`;
    return `${this.result} = ${this.op} ${this.arg1}`;
  }
}

// ─── Triple ───────────────────────────────────────────────────────────────────
/**
 * CONCEPT: Triple representation
 *
 * Same as quadruple but result is NOT stored explicitly.
 * The "result" of instruction i is referred to as "(i)" by later instructions.
 * This saves one field per entry but makes the table harder to reorder.
 *
 *   idx  op       arg1      arg2
 *    0   '>'      'cart_t'  '5000'
 *    1   '='      '"Elec"'  null
 *    2   'AND'    '(0)'     '(1)'
 *    3   'IF_FALSE' '(2)'   null      ← jumps to end
 *    4   '='      '20'      null      ← discount = 20
 *
 * Instruction (0) means "the result of instruction 0".
 */
export class Triple {
  constructor(idx, op, arg1, arg2, comment = '') {
    this.idx     = idx;
    this.op      = op;
    this.arg1    = arg1 ?? null;
    this.arg2    = arg2 ?? null;
    this.comment = comment;
  }

  format() {
    const a1 = this.arg1 ?? '_';
    const a2 = this.arg2;
    if (this.op === 'LABEL')    return `(${this.idx})  LABEL`;
    if (this.op === 'GOTO')     return `(${this.idx})  goto ${a1}`;
    if (this.op === 'IF_FALSE') return `(${this.idx})  if_false ${a1} goto end`;
    if (a2 !== null)            return `(${this.idx})  ${a1} ${this.op} ${a2}`;
    return `(${this.idx})  ${this.op} ${a1}`;
  }
}

// ─── TAC Generator ────────────────────────────────────────────────────────────
class TACGenerator {
  constructor() {
    this.quads     = [];   // list of Quadruple
    this.tempCount = 0;
    this.labelCount= 0;
  }

  newTemp () { return `t${++this.tempCount}`; }
  newLabel() { return `L${this.labelCount++}`; }

  emit(op, arg1, arg2, result, comment = '') {
    const q = new Quadruple(op, arg1, arg2, result, comment);
    this.quads.push(q);
    return result;
  }

  // ── AST walk ────────────────────────────────────────────────────────────────
  gen(node) {
    if (!node) return null;

    switch (node.type) {

      // ── RULE: IF condition THEN action ─────────────────────────────────────
      case NodeType.RULE: {
        const condTemp  = this.gen(node.condition);
        const endLabel  = this.newLabel();
        /**
         * CONCEPT: Conditional branch with back-patching
         *
         * We emit IF_FALSE now targeting endLabel.
         * In a full compiler with multiple rules the "goto" target might
         * not be known yet — that is the back-patching problem:
         * emit the instruction with a placeholder and fill it in later.
         * Here endLabel is known immediately (single-rule scope).
         */
        this.emit('IF_FALSE', condTemp, null, endLabel, `skip action if condition false`);
        this.gen(node.action);
        this.emit('LABEL', null, null, endLabel, `end of rule`);
        return null;
      }

      // ── AND / OR ────────────────────────────────────────────────────────────
      case NodeType.AND: {
        const l = this.gen(node.left);
        const r = this.gen(node.right);
        const t = this.newTemp();
        return this.emit('AND', l, r, t, `${l} AND ${r}`);
      }
      case NodeType.OR: {
        const l = this.gen(node.left);
        const r = this.gen(node.right);
        const t = this.newTemp();
        return this.emit('OR', l, r, t, `${l} OR ${r}`);
      }

      // ── NOT ─────────────────────────────────────────────────────────────────
      case NodeType.NOT: {
        const operand = this.gen(node.operand);
        const t = this.newTemp();
        return this.emit('NOT', operand, null, t, `NOT ${operand}`);
      }

      // ── COMPARISON ──────────────────────────────────────────────────────────
      case NodeType.COMPARISON: {
        const l = this.gen(node.left);
        const r = this.gen(node.right);
        const t = this.newTemp();
        return this.emit(node.operator, l, r, t, `${l} ${node.operator} ${r}`);
      }

      // ── Arithmetic BINARY_OP ────────────────────────────────────────────────
      case NodeType.BINARY_OP: {
        const l = this.gen(node.left);
        const r = this.gen(node.right);
        const t = this.newTemp();
        return this.emit(node.operator, l, r, t, `${l} ${node.operator} ${r}`);
      }

      // ── Atoms ───────────────────────────────────────────────────────────────
      case NodeType.IDENTIFIER: return node.name;
      case NodeType.NUMBER:     return String(node.value);
      case NodeType.STRING:     return `"${node.value}"`;
      case NodeType.BOOLEAN:    return String(node.value);

      // ── ACTION ──────────────────────────────────────────────────────────────
      case NodeType.ACTION: {
        const val = this.gen(node.value);
        return this.emit('=', val, null, node.target, `assign ${node.target}`);
      }

      default: return null;
    }
  }

  generate(ast) {
    this.gen(ast);
    return this.quads;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function generateTAC(ast) {
  return new TACGenerator().generate(ast);
}

// ─── Format Quadruples for display ───────────────────────────────────────────
export function formatTAC(quads) {
  return quads.map((q, i) => ({
    ln     : String(i + 1).padStart(2, '0'),
    line   : q.format(),
    comment: q.comment,
    op     : q.op,
    arg1   : q.arg1,
    arg2   : q.arg2,
    result : q.result,
  }));
}

// ─── Convert Quadruples → Triples ────────────────────────────────────────────
/**
 * CONCEPT: Quadruples → Triples conversion
 *
 * Algorithm:
 *   For each quadruple q at index i:
 *     Replace any arg that equals the *result* of a previous quad k
 *     with the reference "(k)" (pointing into the triples table).
 *
 * This removes the explicit result column; references become positional.
 */
export function toTriples(quads) {
  // Map result-name → quad index (only for temporaries t1,t2,…)
  const resultToIdx = {};
  quads.forEach((q, i) => {
    if (q.result && /^t\d+$/.test(q.result)) resultToIdx[q.result] = i;
  });

  return quads.map((q, i) => {
    const resolveArg = (a) => {
      if (a === null) return null;
      if (/^t\d+$/.test(a) && resultToIdx[a] !== undefined) return `(${resultToIdx[a]})`;
      return a;
    };
    return new Triple(i, q.op, resolveArg(q.arg1), resolveArg(q.arg2), q.comment);
  });
}

export function formatTriples(triples) {
  return triples.map(t => ({
    idx    : t.idx,
    line   : t.format(),
    comment: t.comment,
  }));
}

// ─── Indirect Triples ────────────────────────────────────────────────────────
/**
 * CONCEPT: Indirect Triples
 *
 * An extra level of indirection: a pointer array (execution order) into
 * the triples table.  Reordering instructions requires only changing the
 * pointer array, NOT moving entries in the triples table.
 *
 * This is especially useful for code motion (moving loop-invariant code
 * out of a loop): you reorder the pointers without touching the triples.
 *
 * Example pointer array (optimized order):
 *   [0, 1, 2, 4, 3]  means "execute triple 0, 1, 2, 4, then 3"
 */
export function toIndirectTriples(triples) {
  // Default order: identity permutation
  const pointers = triples.map((_, i) => i);
  return { triples, pointers };
}

export function formatIndirectTriples({ triples, pointers }) {
  return pointers.map((ptr, execOrder) => ({
    execOrder,
    ptr,
    triple: triples[ptr].format(),
    comment: triples[ptr].comment,
  }));
}
