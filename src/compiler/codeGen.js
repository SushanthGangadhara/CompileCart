/**
 * ============================================================
 * codeGen.js — Phase 6: Target Code Generation
 * ============================================================
 *
 * CONCEPTS COVERED:
 *  1. Code Generation from Optimized TAC (not raw AST)
 *  2. Pseudo-Assembly output — register-based 3-address machine
 *  3. Register Allocation — Graph Coloring algorithm (conceptual)
 *  4. Register Descriptor & Address Descriptor
 *  5. Instruction Selection — template matching on TAC ops
 *  6. JavaScript target code (high-level, for execution)
 *  7. Translation explanation (each mapping documented)
 *
 * TARGET MACHINE MODEL (pseudo-assembly):
 *  Registers: R0–R7 (8 general-purpose registers)
 *  Instructions:
 *    LOAD  Ri, x        — load variable x into register Ri
 *    STORE Ri, x        — store register Ri into variable x
 *    MOV   Ri, Rj       — copy register Rj to Ri
 *    ADD   Ri, Rj, Rk   — Ri = Rj + Rk
 *    SUB   Ri, Rj, Rk   — Ri = Rj - Rk
 *    MUL   Ri, Rj, Rk   — Ri = Rj * Rk
 *    DIV   Ri, Rj, Rk   — Ri = Rj / Rk
 *    CMP   Ri, Rj       — compare and set condition flags
 *    JGT/JLT/JGE/JLE/JEQ/JNE  label   — conditional jump
 *    JMP   label        — unconditional jump
 *    AND   Ri, Rj, Rk   — bitwise/logical AND
 *    OR    Ri, Rj, Rk   — bitwise/logical OR
 *    NOT   Ri, Rj       — logical NOT
 *    MOVI  Ri, #imm     — load immediate constant
 *    LABEL label:       — branch target
 *
 * DOCUMENTATION:
 *  File    : src/compiler/codeGen.js
 *  Depends : tacGenerator.js (Quadruple), optimizer.js (optimized quads)
 *  Used by : compiler.js (Phase 6 step, consumes OPTIMIZED TAC)
 *  Exports : generateCode(), generatePseudoAssembly(), explainTranslation()
 * ============================================================
 */

import { NodeType } from './parser';

// ─── Register set ─────────────────────────────────────────────────────────────
const NUM_REGS  = 8;
const REGISTERS = Array.from({ length: NUM_REGS }, (_, i) => `R${i}`);

// ─── Register Allocation: Graph Coloring (conceptual model) ──────────────────
/**
 * CONCEPT: Register Allocation via Graph Coloring
 *
 * Steps:
 *   1. Build interference graph: nodes = live ranges (temporaries + vars),
 *      edges = between ranges that are simultaneously live.
 *   2. Color the graph using k colors (k = number of registers).
 *   3. Spill to memory any node that cannot be colored (no register available).
 *
 * For our small rule language the interference graph is trivially small
 * (≤ 10 temporaries), so all temporaries fit in R0–R7 with no spills.
 * We demonstrate the algorithm by building the interference edges from
 * liveness data and assigning colors greedily.
 */
export function graphColorRegAlloc(quads, livenessData) {
  // Collect all temporaries and variables (excluding labels, constants)
  const vars = new Set();
  quads.forEach(q => {
    [q.arg1, q.arg2, q.result].forEach(a => {
      if (a && /^[a-z_t]/.test(a) && !/^L\d+$/.test(a)) vars.add(a);
    });
  });

  // Build interference graph edges
  const interference = {};
  vars.forEach(v => { interference[v] = new Set(); });

  livenessData.forEach(({ live_out }) => {
    const liveList = live_out.filter(v => vars.has(v));
    for (let i = 0; i < liveList.length; i++) {
      for (let j = i + 1; j < liveList.length; j++) {
        interference[liveList[i]].add(liveList[j]);
        interference[liveList[j]].add(liveList[i]);
      }
    }
  });

  // Greedy graph coloring (simplicial elimination order)
  const color  = {};   // var → register name
  const spills = [];

  // Sort by degree (most-constrained first)
  const sorted = [...vars].sort((a, b) =>
    (interference[b]?.size || 0) - (interference[a]?.size || 0));

  sorted.forEach(v => {
    const used = new Set(
      [...(interference[v] || [])].map(nb => color[nb]).filter(Boolean));
    const avail = REGISTERS.find(r => !used.has(r));
    if (avail) {
      color[v] = avail;
    } else {
      spills.push(v);
      color[v] = 'MEM';  // spilled to memory
    }
  });

  return {
    color,
    spills,
    interferenceEdges: Object.entries(interference).map(([v, s]) =>
      ({ from: v, to: [...s] })),
    registers: REGISTERS,
  };
}

// ─── Register Descriptor & Address Descriptor ────────────────────────────────
/**
 * CONCEPT: Register Descriptor + Address Descriptor
 *
 * Register Descriptor (RD):
 *   RD[Ri] = set of variables/temporaries currently held in Ri
 *
 * Address Descriptor (AD):
 *   AD[x] = set of locations (registers or memory) holding current value of x
 *
 * These are maintained during code generation to avoid redundant
 * LOADs and STOREs.
 */
class RegAllocState {
  constructor() {
    this.rd = {};  // register → variable name (simplified: one var per reg)
    this.ad = {};  // variable → register or 'mem'
    REGISTERS.forEach(r => { this.rd[r] = null; });
  }

  getReg(varName, colorMap) {
    // If already in a register, return it
    if (this.ad[varName] && this.ad[varName] !== 'mem') return this.ad[varName];
    // Assign from color map
    const reg = colorMap[varName] || 'R0';
    this.ad[varName] = reg;
    this.rd[reg] = varName;
    return reg;
  }

  descDump() {
    return {
      regDesc : Object.entries(this.rd).filter(([, v]) => v).map(([r, v]) => `${r}→${v}`),
      addrDesc: Object.entries(this.ad).map(([v, r]) => `${v}@${r}`),
    };
  }
}

// ─── Pseudo-Assembly Generator ────────────────────────────────────────────────
/**
 * Translates optimized TAC quadruples to pseudo-assembly instructions.
 * Input: optimized quads array, register color map from graph coloring.
 */
export function generatePseudoAssembly(quads, livenessData = []) {
  const allocResult = graphColorRegAlloc(quads, livenessData);
  const colorMap    = allocResult.color;
  const state       = new RegAllocState();
  const asm         = [];
  const descLog     = [];

  const emit = (instr, comment = '') => asm.push({ instr, comment });

  const getReg = name => {
    if (!name || /^L\d+$/.test(name)) return name;
    if (!isNaN(Number(name))) return `#${name}`;  // immediate
    if (/^"/.test(name)) return name;             // string constant
    return state.getReg(name, colorMap);
  };

  quads.forEach((q, i) => {
    switch (q.op) {
      case 'LABEL':
        emit(`${q.result}:`);
        break;

      case 'GOTO':
        emit(`JMP  ${q.result}`, 'unconditional jump');
        break;

      case 'IF_FALSE': {
        const rCond = getReg(q.arg1);
        emit(`CMP  ${rCond}, #0`, 'test condition');
        emit(`JEQ  ${q.result}`, 'jump if condition false');
        break;
      }

      case '=': {
        // Assignment / copy
        const rDst = getReg(q.result);
        const rSrc = getReg(q.arg1);
        if (rSrc.startsWith('#') || rSrc.startsWith('"')) {
          emit(`MOVI ${rDst}, ${rSrc}`, `load immediate ${q.arg1}`);
        } else {
          emit(`MOV  ${rDst}, ${rSrc}`, `${q.result} = ${q.arg1}`);
        }
        state.ad[q.result] = rDst;
        break;
      }

      case 'NOT': {
        const rDst = getReg(q.result);
        const rSrc = getReg(q.arg1);
        emit(`NOT  ${rDst}, ${rSrc}`, `${q.result} = NOT ${q.arg1}`);
        break;
      }

      default: {
        // Binary operation
        const rDst = getReg(q.result);
        const rA   = getReg(q.arg1);
        const rB   = getReg(q.arg2);
        const opMap = {
          '+' : 'ADD', '-' : 'SUB', '*' : 'MUL', '/' : 'DIV',
          'AND': 'AND', 'OR': 'OR',
          '>'  : 'SETGT', '<': 'SETLT', '>=' : 'SETGE',
          '<=' : 'SETLE', '=': 'SETEQ', '!=': 'SETNE',
        };
        const asmOp = opMap[q.op] || q.op;
        emit(`${asmOp.padEnd(4)} ${rDst}, ${rA}, ${rB}`,
          `${q.result} = ${q.arg1} ${q.op} ${q.arg2}`);
        state.ad[q.result] = rDst;
        break;
      }
    }

    // Snapshot descriptors every few instructions
    if (i % 2 === 0) descLog.push({ after: i, ...state.descDump() });
  });

  return { asm, allocResult, descLog };
}

// ─── JavaScript Code Generator (high-level, for safe execution) ──────────────
/**
 * Generates clean JavaScript from the OPTIMIZED TAC.
 * This closes the gap identified in code review:
 * previously codeGen used the raw AST; now it consumes the optimized quads.
 */
export function generateJSFromTAC(quads) {
  const lines    = [];
  const tempVars = new Set();

  // Collect temporaries used
  quads.forEach(q => {
    if (q.result && /^t\d+$/.test(q.result)) tempVars.add(q.result);
  });

  lines.push('// ─── Generated by ShopDemo Compiler (from Optimized TAC) ───────────');
  lines.push('// ─── NEVER executed via eval() — shown for educational transparency ──');
  lines.push('');
  lines.push('function applyRule(ctx) {');
  if (tempVars.size) {
    lines.push(`  let ${[...tempVars].join(', ')};`);
  }
  lines.push('');

  const OP_MAP = { '>':'>', '<':'<', '>=':'>=', '<=':'<=', '=':'===', '!=':'!==', '+':'+', '-':'-', '*':'*', '/':'/' };

  quads.forEach(q => {
    switch (q.op) {
      case 'LABEL':
        lines.push(`  ${q.result}:`);
        break;
      case 'GOTO':
        lines.push(`  goto ${q.result};  // JS has no goto; use structured flow`);
        break;
      case 'IF_FALSE':
        lines.push(`  if (!${q.arg1}) { goto ${q.result}; }`);
        break;
      case '=': {
        const rhs = q.arg1.startsWith('"') ? q.arg1 : (isNaN(Number(q.arg1)) ? `ctx.${q.arg1}` : q.arg1);
        const lhs = /^t\d+$/.test(q.result) ? q.result : `ctx.${q.result}`;
        lines.push(`  ${lhs} = ${rhs};  // ${q.comment}`);
        break;
      }
      case 'NOT': {
        const lhs = /^t\d+$/.test(q.result) ? q.result : `ctx.${q.result}`;
        const rhs = /^t\d+$/.test(q.arg1) ? q.arg1 : `ctx.${q.arg1}`;
        lines.push(`  ${lhs} = !${rhs};`);
        break;
      }
      case 'AND': {
        const a1  = /^t\d+$/.test(q.arg1) ? q.arg1 : `ctx.${q.arg1}`;
        const a2  = /^t\d+$/.test(q.arg2) ? q.arg2 : `ctx.${q.arg2}`;
        lines.push(`  ${q.result} = (${a1} && ${a2});`);
        break;
      }
      case 'OR': {
        const a1  = /^t\d+$/.test(q.arg1) ? q.arg1 : `ctx.${q.arg1}`;
        const a2  = /^t\d+$/.test(q.arg2) ? q.arg2 : `ctx.${q.arg2}`;
        lines.push(`  ${q.result} = (${a1} || ${a2});`);
        break;
      }
      default: {
        const jsOp = OP_MAP[q.op] || q.op;
        const lhs  = /^t\d+$/.test(q.result) ? q.result : `ctx.${q.result}`;
        const a1   = q.arg1.startsWith('"') ? q.arg1 : (isNaN(Number(q.arg1)) ? `ctx.${q.arg1}` : q.arg1);
        const a2   = q.arg2?.startsWith('"') ? q.arg2 : (!isNaN(Number(q.arg2)) ? q.arg2 : q.arg2 ? `ctx.${q.arg2}` : '');
        lines.push(`  ${lhs} = (${a1} ${jsOp} ${a2});  // ${q.comment}`);
        break;
      }
    }
  });

  lines.push('}');
  return lines.join('\n');
}

// ─── JavaScript Code Generator from AST (kept for reference) ─────────────────
/**
 * AST-based JS generator — kept to show the contrast with TAC-based generation.
 * In a real compiler, code gen operates on the IR (TAC), not the AST directly.
 */
export function generateCode(ast) {
  if (!ast) return '// No valid AST';

  function genCond(node) {
    if (!node) return 'false';
    switch (node.type) {
      case NodeType.OR:         return `(${genCond(node.left)} || ${genCond(node.right)})`;
      case NodeType.AND:        return `(${genCond(node.left)} && ${genCond(node.right)})`;
      case NodeType.NOT:        return `!(${genCond(node.operand)})`;
      case NodeType.COMPARISON: {
        const op = node.operator === '=' ? '===' : node.operator === '!=' ? '!==' : node.operator;
        return `${genExpr(node.left)} ${op} ${genExpr(node.right)}`;
      }
      default: return genExpr(node);
    }
  }

  function genExpr(node) {
    if (!node) return 'null';
    switch (node.type) {
      case NodeType.NUMBER:     return String(node.value);
      case NodeType.STRING:     return `"${node.value}"`;
      case NodeType.BOOLEAN:    return String(node.value);
      case NodeType.IDENTIFIER: return `ctx.${node.name}`;
      case NodeType.BINARY_OP:  return `(${genExpr(node.left)} ${node.operator} ${genExpr(node.right)})`;
      default: return genCond(node);
    }
  }

  const cond = genCond(ast.condition);
  const act  = ast.action ? `ctx.${ast.action.target} = ${genExpr(ast.action.value)};` : '';

  return [
    '// ─── Generated from AST (reference only — TAC-based version is above) ──',
    '',
    'function applyRule(ctx) {',
    `  if (${cond}) {`,
    `    ${act}`,
    '  }',
    '}',
  ].join('\n');
}

// ─── Translation explanation ──────────────────────────────────────────────────
export function explainTranslation(ast) {
  if (!ast) return [];
  return [
    { label: 'Source → Optimized TAC',    detail: 'Code generation now consumes the OPTIMIZED TAC, not the raw AST. This closes the AST-vs-TAC gap.' },
    { label: 'TAC → Pseudo-Assembly',     detail: 'Each TAC quadruple maps to one or two pseudo-assembly instructions via template matching.' },
    { label: 'Register Allocation',       detail: 'Graph-coloring over the interference graph assigns temporaries to R0–R7. Spills go to MEM.' },
    { label: 'Register Descriptors',      detail: 'RD[Ri] tracks which variable is in register Ri. AD[x] tracks where x currently lives.' },
    { label: 'IF_FALSE → CMP + JEQ',      detail: 'TAC IF_FALSE t goto L  →  CMP R, #0  then  JEQ L (jump if zero = condition false).' },
    { label: 'AND/OR → logical ops',      detail: 'TAC AND/OR map directly to AND/OR pseudo-assembly instructions.' },
    { label: '= comparison → SETEQ etc.', detail: 'Relational ops produce SET* instructions that write 1/0 to a result register.' },
    { label: 'Identifiers → ctx.',        detail: 'All business-context identifiers are accessed via the ctx object in the JS output.' },
    { label: 'No eval()',                 detail: 'The JS output is NEVER evaluated via eval() or Function(). Execution uses the safe AST interpreter.' },
  ];
}
