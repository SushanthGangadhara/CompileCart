/**
 * ============================================================
 * optimizer.js — Phase 5: Code Optimization
 * ============================================================
 *
 * CONCEPTS COVERED:
 *  1. Basic Blocks — maximal straight-line code sequences
 *  2. Control Flow Graph (CFG) — basic blocks + edges
 *  3. Data Flow Analysis — reaching definitions (forward), liveness (backward)
 *  4. Common Subexpression Elimination (CSE) with Value Numbering
 *  5. Constant Folding — evaluate constant expressions at compile time
 *  6. Constant Propagation — substitute known constants
 *  7. Copy Propagation — replace copies with originals
 *  8. Dead Code Elimination — remove unreachable instructions
 *  9. Dead Temporary Elimination — remove unused temporaries
 * 10. Algebraic Simplification — x*1=x, x+0=x, etc.
 * 11. Redundant Instruction Elimination — remove duplicates
 * 12. Loop Optimization — strength reduction, LICM concept (demo)
 *
 * DOCUMENTATION:
 *  File    : src/compiler/optimizer.js
 *  Depends : tacGenerator.js (Quadruple)
 *  Used by : compiler.js (Phase 5 step)
 *  Exports : optimize(), buildCFG(), computeReachingDefs(),
 *            computeLiveness(), valueNumbering()
 * ============================================================
 */

import { Quadruple } from './tacGenerator';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deepCopy(quads) { return quads.map(q => new Quadruple(q.op, q.arg1, q.arg2, q.result, q.comment)); }
const isConst  = v => v !== null && v !== undefined && !isNaN(Number(v)) && !/^t\d+$/.test(v) && !/^[a-z_]/.test(v);
const isTemp   = v => v && /^t\d+$/.test(v);
const ARITH    = new Set(['+','-','*','/']);
const REL      = new Set(['>','<','>=','<=','=','!=']);
const BOOL_OPS = new Set(['AND','OR','NOT']);

function evalBinary(op, a, b) {
  const na = Number(a), nb = Number(b);
  if (ARITH.has(op)) {
    switch (op) {
      case '+': return na + nb;
      case '-': return na - nb;
      case '*': return na * nb;
      case '/': return nb !== 0 ? na / nb : null;
      default:  return null;
    }
  }
  if (REL.has(op)) {
    if (!isNaN(na) && !isNaN(nb)) {
      switch (op) {
        case '>':  return na > nb  ? 'true' : 'false';
        case '<':  return na < nb  ? 'true' : 'false';
        case '>=': return na >= nb ? 'true' : 'false';
        case '<=': return na <= nb ? 'true' : 'false';
        case '=':  return na === nb? 'true' : 'false';
        case '!=': return na !== nb? 'true' : 'false';
        default:   return null;
      }
    }
    const sa = String(a).replace(/"/g,''), sb = String(b).replace(/"/g,'');
    if (op === '=')  return sa === sb ? 'true' : 'false';
    if (op === '!=') return sa !== sb ? 'true' : 'false';
    return null;
  }
  if (op === 'AND') return (a==='true') && (b==='true') ? 'true' : 'false';
  if (op === 'OR')  return (a==='true') || (b==='true') ? 'true' : 'false';
  return null;
}

// ─── 1. Basic Block Construction ─────────────────────────────────────────────
/**
 * CONCEPT: Basic Block
 *
 * A basic block is a maximal sequence of consecutive instructions
 * such that:
 *  (a) Control enters only at the FIRST instruction
 *  (b) Control leaves only at the LAST instruction (no branches in middle)
 *
 * Algorithm (leaders method):
 *  1. First instruction is a leader
 *  2. Any instruction that is the target of a GOTO/IF_FALSE is a leader
 *  3. Any instruction immediately following a GOTO/IF_FALSE is a leader
 *  4. A LABEL instruction starts a new block
 */
export function buildBasicBlocks(quads) {
  if (!quads.length) return [];

  // Step 1: identify leaders
  const leaders = new Set([0]);
  quads.forEach((q, i) => {
    if (q.op === 'GOTO' || q.op === 'IF_FALSE') {
      if (i + 1 < quads.length) leaders.add(i + 1);
    }
    if (q.op === 'LABEL') leaders.add(i);
  });

  // Step 2: partition into blocks
  const blocks = [];
  let current  = null;

  quads.forEach((q, i) => {
    if (leaders.has(i)) {
      if (current) blocks.push(current);
      current = {
        id           : `B${blocks.length}`,
        startIdx     : i,
        instructions : [],
        predecessors : [],
        successors   : [],
      };
    }
    current.instructions.push({ ...q, globalIdx: i });
  });
  if (current) blocks.push(current);

  return blocks;
}

// ─── 2. CFG Construction ─────────────────────────────────────────────────────
/**
 * CONCEPT: Control Flow Graph (CFG)
 *
 * Nodes = basic blocks, Edges = possible control transfers.
 * An edge B1→B2 exists if B2 can execute right after B1.
 *
 * We add:
 *  - A "fall-through" edge to the next block (unless block ends with GOTO)
 *  - A "branch" edge to the label target of IF_FALSE or GOTO
 */
export function buildCFG(blocks, quads) {
  // Map label name → block index
  const labelToBlock = {};
  blocks.forEach((b, i) => {
    const first = b.instructions[0];
    if (first && first.op === 'LABEL') labelToBlock[first.result] = i;
  });

  blocks.forEach((b, i) => {
    const last = b.instructions[b.instructions.length - 1];
    if (!last) return;

    if (last.op === 'GOTO') {
      const target = labelToBlock[last.result];
      if (target !== undefined) {
        b.successors.push(blocks[target].id);
        blocks[target].predecessors.push(b.id);
      }
    } else if (last.op === 'IF_FALSE') {
      // Fall-through
      if (i + 1 < blocks.length) {
        b.successors.push(blocks[i + 1].id);
        blocks[i + 1].predecessors.push(b.id);
      }
      // Branch target
      const target = labelToBlock[last.result];
      if (target !== undefined) {
        b.successors.push(blocks[target].id);
        blocks[target].predecessors.push(b.id);
      }
    } else {
      // Sequential fall-through
      if (i + 1 < blocks.length) {
        b.successors.push(blocks[i + 1].id);
        blocks[i + 1].predecessors.push(b.id);
      }
    }
  });

  return blocks;
}

// ─── 3. Reaching Definitions (forward data flow) ─────────────────────────────
/**
 * CONCEPT: Reaching Definitions
 *
 * A definition d of variable x REACHES point p if there exists a path
 * from d to p along which x is not re-defined.
 *
 * Data flow equations (forward, may analysis):
 *   OUT[B] = GEN[B]  ∪  (IN[B] − KILL[B])
 *   IN[B]  = ∪  OUT[P]  for all predecessors P of B
 *
 * GEN[B]  = definitions generated in B (last def of each var in B)
 * KILL[B] = definitions of same variable from other blocks killed by B
 *
 * This is a simplified version operating on the flat quad list.
 */
export function computeReachingDefs(quads) {
  // Each "def" is { varName, quadIdx }
  const allDefs = [];
  quads.forEach((q, i) => {
    if (q.result && q.op !== 'LABEL' && q.op !== 'GOTO' && q.op !== 'IF_FALSE') {
      allDefs.push({ varName: q.result, quadIdx: i });
    }
  });

  // For display: show which definition reaches each use
  const reachMap = {};   // varName → [list of defining quad indices that reach end]
  const seenDefs = {};

  quads.forEach((q, i) => {
    // Kill previous defs of same variable, generate this def
    if (q.result && q.op !== 'LABEL' && q.op !== 'GOTO') {
      seenDefs[q.result] = i;  // latest definition
    }
    // Record what reaches each use
    [q.arg1, q.arg2].filter(Boolean).forEach(a => {
      if (/^[a-z_]/.test(a) && seenDefs[a] !== undefined) {
        if (!reachMap[a]) reachMap[a] = [];
        if (!reachMap[a].includes(seenDefs[a])) reachMap[a].push(seenDefs[a]);
      }
    });
  });

  return { allDefs, reachMap };
}

// ─── 4. Liveness Analysis (backward data flow) ───────────────────────────────
/**
 * CONCEPT: Liveness Analysis
 *
 * A variable x is LIVE at point p if there is a path from p to a USE
 * of x that does not pass through a re-definition of x.
 *
 * Data flow equations (backward, may analysis):
 *   IN[B]  = USE[B]  ∪  (OUT[B] − DEF[B])
 *   OUT[B] = ∪  IN[S]  for all successors S of B
 *
 * USE[B]  = variables used in B before being defined
 * DEF[B]  = variables defined in B before any use
 *
 * Critical use: dead code/variable elimination.
 * A definition of x is DEAD if x is not live after the definition.
 */
export function computeLiveness(quads) {
  const n = quads.length;
  // in[i] and out[i] are sets of variable names
  const live_in  = Array.from({ length: n }, () => new Set());
  const live_out = Array.from({ length: n }, () => new Set());

  // Single backward pass (simplified — no loops, one iteration suffices)
  for (let i = n - 1; i >= 0; i--) {
    const q = quads[i];
    // USE: args that are identifiers or temporaries
    const uses = [q.arg1, q.arg2].filter(a => a && /^[a-z_t]/.test(a));
    // DEF: result if it's a variable or temporary
    const def  = q.result && !/^L\d+$/.test(q.result) ? q.result : null;

    // out[i] = union of in[i+1] (successor; simplified for linear code)
    if (i + 1 < n) live_out[i] = new Set([...live_in[i + 1]]);

    // in[i] = use[i] ∪ (out[i] − def[i])
    const new_in = new Set(uses);
    live_out[i].forEach(v => { if (v !== def) new_in.add(v); });
    live_in[i] = new_in;
  }

  return live_in.map((s, i) => ({
    quadIdx  : i,
    live_in  : [...s],
    live_out : [...live_out[i]],
  }));
}

// ─── 5. Value Numbering (CSE basis) ──────────────────────────────────────────
/**
 * CONCEPT: Value Numbering
 *
 * Assign a unique number to each distinct computed value.
 * Two expressions with the same value number compute the same result.
 * If expression E was already computed into t_k, reuse t_k instead.
 *
 * This is the LOCAL value numbering algorithm (within a basic block):
 *   For each instruction  result = arg1 op arg2:
 *     vn1 = valueNum(arg1),  vn2 = valueNum(arg2)
 *     key = (op, vn1, vn2)
 *     if key already in table → CSE: replace result with existing temp
 *     else → assign new value number, record key→result
 */
export function valueNumbering(quads) {
  const vnTable  = {};   // varName  → value number
  const exprTable= {};   // expr-key → { valueNum, tempName }
  const cseMap   = {};   // result   → replacement temp (for CSE substitutions)
  let   nextVN   = 0;
  const log      = [];

  function getVN(name) {
    if (name === null) return null;
    if (!isNaN(Number(name))) return `c${name}`;   // constant → own VN
    if (vnTable[name] !== undefined) return vnTable[name];
    const vn = `v${nextVN++}`;
    vnTable[name] = vn;
    return vn;
  }

  quads.forEach((q, i) => {
    if (q.op === 'LABEL' || q.op === 'GOTO' || q.op === 'IF_FALSE') return;

    const vn1 = getVN(q.arg1);
    const vn2 = getVN(q.arg2);
    const key = `${q.op}|${vn1}|${vn2}`;

    if (q.result) {
      if (exprTable[key]) {
        // CSE hit: this expression was already computed
        const { tempName } = exprTable[key];
        cseMap[q.result] = tempName;
        log.push({
          quadIdx: i,
          type   : 'CSE',
          msg    : `${q.result} = ${q.arg1} ${q.op} ${q.arg2 ?? ''} → already in ${tempName} (value number match)`,
        });
      } else {
        exprTable[key] = { valueNum: `v${nextVN++}`, tempName: q.result };
        vnTable[q.result] = exprTable[key].valueNum;
        log.push({
          quadIdx: i,
          type   : 'NEW',
          msg    : `${q.result} assigned value number ${exprTable[key].valueNum}  (key: ${key})`,
        });
      }
    }
  });

  return { cseMap, log, vnTable };
}

// ─── 6. Loop Optimization (concept demo) ─────────────────────────────────────
/**
 * CONCEPT: Loop Optimization
 *
 * Our rule language has no explicit loops, but we demonstrate the
 * conceptual algorithms that apply to any loop-bearing IR:
 *
 * (a) Loop-Invariant Code Motion (LICM):
 *     An instruction whose operands are not modified inside the loop
 *     can be moved to the loop pre-header (executed once, not per iteration).
 *
 * (b) Strength Reduction:
 *     Replace expensive ops with cheaper equivalents inside loops:
 *       i * 4  →  i << 2   (multiply by power-of-2 → shift)
 *       i * i  →  sum of i odd numbers (induction variable)
 *
 * (c) Induction Variable Elimination:
 *     If j = i * c + d, and i increments by 1 each iteration,
 *     we can replace j with j + c (one addition per iteration instead
 *     of a multiply).
 *
 * Since the rule language is loop-free, we log this as an informational
 * note in the optimization report.
 */
export const LOOP_OPTIMIZATION_NOTES = [
  {
    technique  : 'Loop-Invariant Code Motion (LICM)',
    applicable : false,
    reason     : 'Rule language has no loops. LICM would hoist invariant computations to loop pre-header.',
    example    : 'BEFORE: for(i){t=a*b; x=t+i}  AFTER: t=a*b; for(i){x=t+i}',
  },
  {
    technique  : 'Strength Reduction',
    applicable : false,
    reason     : 'No loop induction variables present.',
    example    : 'i*4 → i<<2  inside a loop body',
  },
  {
    technique  : 'Induction Variable Elimination',
    applicable : false,
    reason     : 'No loop structure; no induction variables.',
    example    : 'j=i*c+d with i++ per iter → j+=c per iter (eliminates multiply)',
  },
];

// ─── Main optimization pipeline ──────────────────────────────────────────────
export function optimize(quads) {
  let instrs = deepCopy(quads);
  const transformations = [];
  const log = (pass, msg) => transformations.push({ pass, msg });

  const originalCount = instrs.length;

  // ── Pass 1: Constant Folding ────────────────────────────────────────────────
  instrs = instrs.map(q => {
    if (q.arg2 !== null && isConst(q.arg1) && isConst(q.arg2)) {
      const r = evalBinary(q.op, q.arg1, q.arg2);
      if (r !== null) {
        log('Constant Folding', `${q.result} = ${q.arg1} ${q.op} ${q.arg2}  →  ${q.result} = ${r}`);
        return new Quadruple('=', String(r), null, q.result, `folded constant`);
      }
    }
    return q;
  });

  // ── Pass 2: Constant Propagation ───────────────────────────────────────────
  const constMap = {};
  instrs = instrs.map(q => {
    if (q.op === '=' && q.result && isConst(q.arg1)) constMap[q.result] = q.arg1;
    const n = new Quadruple(q.op, q.arg1, q.arg2, q.result, q.comment);
    let changed = false;
    if (n.arg1 && constMap[n.arg1]) { log('Constant Propagation', `${n.arg1} → ${constMap[n.arg1]}`); n.arg1 = constMap[n.arg1]; changed = true; }
    if (n.arg2 && constMap[n.arg2]) { log('Constant Propagation', `${n.arg2} → ${constMap[n.arg2]}`); n.arg2 = constMap[n.arg2]; changed = true; }
    return n;
  });

  // ── Pass 3: Copy Propagation ───────────────────────────────────────────────
  const copyMap = {};
  instrs = instrs.map(q => {
    if (q.op === '=' && q.result && q.arg1 && !isConst(q.arg1) && q.arg2 === null) copyMap[q.result] = q.arg1;
    const n = new Quadruple(q.op, q.arg1, q.arg2, q.result, q.comment);
    if (n.arg1 && copyMap[n.arg1]) { log('Copy Propagation', `${n.arg1} → ${copyMap[n.arg1]}`); n.arg1 = copyMap[n.arg1]; }
    if (n.arg2 && copyMap[n.arg2]) { log('Copy Propagation', `${n.arg2} → ${copyMap[n.arg2]}`); n.arg2 = copyMap[n.arg2]; }
    return n;
  });

  // ── Pass 4: Value Numbering / CSE ──────────────────────────────────────────
  const { cseMap, log: vnLog } = valueNumbering(instrs);
  if (Object.keys(cseMap).length) {
    // Apply CSE substitutions
    instrs = instrs.map(q => {
      if (q.result && cseMap[q.result]) {
        log('CSE (Value Numbering)', `Eliminated ${q.result} = ${q.arg1} ${q.op} ${q.arg2 ?? ''}; reuse ${cseMap[q.result]}`);
        return new Quadruple('=', cseMap[q.result], null, q.result, 'CSE reuse');
      }
      return q;
    });
  }

  // ── Pass 5: Algebraic Simplification ──────────────────────────────────────
  instrs = instrs.map(q => {
    if (q.op === '*') {
      if (q.arg1 === '1') { log('Algebraic Simplification', `${q.result} = 1 * ${q.arg2}  →  ${q.result} = ${q.arg2}`); return new Quadruple('=', q.arg2, null, q.result); }
      if (q.arg2 === '1') { log('Algebraic Simplification', `${q.result} = ${q.arg1} * 1  →  ${q.result} = ${q.arg1}`); return new Quadruple('=', q.arg1, null, q.result); }
      if (q.arg1 === '0' || q.arg2 === '0') { log('Algebraic Simplification', `${q.result} = ${q.arg1} * ${q.arg2}  →  ${q.result} = 0`); return new Quadruple('=', '0', null, q.result); }
    }
    if (q.op === '+') {
      if (q.arg1 === '0') { log('Algebraic Simplification', `0 + ${q.arg2}  →  ${q.arg2}`); return new Quadruple('=', q.arg2, null, q.result); }
      if (q.arg2 === '0') { log('Algebraic Simplification', `${q.arg1} + 0  →  ${q.arg1}`); return new Quadruple('=', q.arg1, null, q.result); }
    }
    if (q.op === '-' && q.arg2 === '0') {
      log('Algebraic Simplification', `${q.arg1} - 0  →  ${q.arg1}`);
      return new Quadruple('=', q.arg1, null, q.result);
    }
    return q;
  });

  // ── Pass 6: Dead Temporary Elimination (via Liveness) ─────────────────────
  /**
   * CONCEPT: Uses liveness analysis (computed above) to identify
   * temporaries that are defined but never used afterward.
   * A definition of t is DEAD if t ∉ live_out at that point.
   */
  const usedTemps = new Set();
  instrs.forEach(q => {
    if (q.arg1 && isTemp(q.arg1)) usedTemps.add(q.arg1);
    if (q.arg2 && isTemp(q.arg2)) usedTemps.add(q.arg2);
    if (q.op === 'IF_FALSE' && q.arg1 && isTemp(q.arg1)) usedTemps.add(q.arg1);
  });
  instrs = instrs.filter(q => {
    if (q.result && isTemp(q.result) && !usedTemps.has(q.result)) {
      log('Dead Temporary Elimination', `Removed dead temp: ${q.result} = ${q.arg1} ${q.op} ${q.arg2 ?? ''}`);
      return false;
    }
    return true;
  });

  // ── Pass 7: Redundant Instruction Elimination ──────────────────────────────
  const seen = new Set();
  instrs = instrs.filter(q => {
    if (q.op === '=' && q.result && q.arg2 === null) {
      const key = `${q.result}:=${q.arg1}`;
      if (seen.has(key)) { log('Redundant Instruction Elimination', `Removed duplicate: ${q.result} = ${q.arg1}`); return false; }
      seen.add(key);
    }
    return true;
  });

  const optimizedCount = instrs.length;
  if (!transformations.length) {
    transformations.push({ pass: 'No Optimization', msg: 'Rule is already in optimal form — no transformations applied.' });
  }

  // Compute basic blocks and CFG for the original quads (for display)
  const basicBlocks = buildBasicBlocks(quads);
  const cfg         = buildCFG(basicBlocks, quads);
  const liveness    = computeLiveness(quads);
  const reaching    = computeReachingDefs(quads);
  const vnResult    = valueNumbering(quads);

  return {
    optimized        : instrs,
    transformations,
    originalCount,
    optimizedCount,
    reductionCount   : originalCount - optimizedCount,
    basicBlocks      : cfg,
    liveness,
    reachingDefs     : reaching,
    valueNumbering   : vnResult,
    loopNotes        : LOOP_OPTIMIZATION_NOTES,
  };
}

// ─── Format optimized TAC for display ────────────────────────────────────────
export function formatOptimizedTAC(quads) {
  return quads.map((q, i) => ({
    ln     : String(i + 1).padStart(2, '0'),
    line   : q.format(),
    comment: q.comment,
  }));
}
