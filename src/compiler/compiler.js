/**
 * ============================================================
 * compiler.js — Full Compiler Pipeline Orchestrator
 * ============================================================
 *
 * PIPELINE:
 *  Source Text
 *    │
 *    ▼ Phase 1 ─ Lexical Analysis      (lexer.js)
 *  Token Stream + Symbol Table Entries
 *    │
 *    ▼ Phase 2 ─ Syntax Analysis       (parser.js)
 *  Parse Tree  +  AST
 *    │
 *    ▼ Phase 3 ─ Semantic Analysis     (semantic.js)
 *  Annotated AST + SymbolTable dump
 *    │
 *    ▼ Phase 4 ─ IR Generation         (tacGenerator.js)
 *  Quadruples  +  Triples  +  Indirect Triples
 *    │
 *    ▼ Phase 5 ─ Optimization          (optimizer.js)
 *  Optimized Quads + CFG + Liveness + Reaching Defs + CSE log
 *    │
 *    ▼ Phase 6 ─ Code Generation       (codeGen.js)
 *  Pseudo-Assembly + JS (from optimized TAC) + Register Allocation
 *    │
 *    ▼ Phase 7 ─ Safe Execution        (executor.js)
 *  Result { conditionMet, action }
 *
 * DOCUMENTATION:
 *  File    : src/compiler/compiler.js
 *  Exports : compile(), buildHistoryEntry()
 * ============================================================
 */

import { tokenize }           from './lexer';
import { parse }              from './parser';
import { analyze }            from './semantic';
import {
  generateTAC, formatTAC,
  toTriples, formatTriples,
  toIndirectTriples, formatIndirectTriples,
}                             from './tacGenerator';
import {
  optimize, formatOptimizedTAC,
}                             from './optimizer';
import {
  generatePseudoAssembly,
  generateJSFromTAC,
  generateCode,
  explainTranslation,
}                             from './codeGen';

export function compile(source) {
  const result = {
    source,
    success : false,
    phases  : {},
    errors  : [],
    warnings: [],
    ast     : null,
  };

  // ── Phase 1: Lexical Analysis ───────────────────────────────────────────────
  const lexResult = tokenize(source);
  result.phases.lexer = {
    tokens           : lexResult.tokens,
    errors           : lexResult.errors,
    symbolTableEntries: lexResult.symbolTableEntries,
    success          : lexResult.errors.length === 0,
  };
  if (lexResult.errors.length) {
    result.errors = lexResult.errors.map(e => e.toString());
    return result;
  }

  // ── Phase 2: Syntax Analysis ────────────────────────────────────────────────
  const parseResult = parse(lexResult.tokens);
  result.phases.parser = {
    parseTree : parseResult.parseTree,   // ← concrete parse tree
    ast       : parseResult.ast,         // ← abstract syntax tree
    errors    : parseResult.errors,
    steps     : parseResult.steps,
    success   : parseResult.errors.length === 0 && !!parseResult.ast,
  };
  if (parseResult.errors.length || !parseResult.ast) {
    result.errors = parseResult.errors.map(e => e.toString());
    return result;
  }

  // ── Phase 3: Semantic Analysis ──────────────────────────────────────────────
  const semResult = analyze(parseResult.ast);
  result.phases.semantic = {
    errors      : semResult.errors,
    warnings    : semResult.warnings,
    checks      : semResult.checks,
    symbolTable : semResult.symbolTable,   // ← full SymbolTable dump
    history     : semResult.history,
    success     : semResult.errors.length === 0,
  };
  if (semResult.errors.length) {
    result.errors   = semResult.errors.map(e => e.toString());
    result.warnings = semResult.warnings;
    return result;
  }
  result.warnings = semResult.warnings;
  result.ast      = parseResult.ast;

  // ── Phase 4: IR Generation ──────────────────────────────────────────────────
  const quads         = generateTAC(parseResult.ast);
  const triples       = toTriples(quads);
  const indirectTrips = toIndirectTriples(triples);

  result.phases.tac = {
    quadruples      : quads,
    formatted       : formatTAC(quads),
    triples         : triples,
    fmtTriples      : formatTriples(triples),
    indirectTriples : indirectTrips,
    fmtIndirect     : formatIndirectTriples(indirectTrips),
    success         : true,
  };

  // ── Phase 5: Optimization ───────────────────────────────────────────────────
  const optResult = optimize(quads);

  result.phases.optimizer = {
    ...optResult,
    formattedOptimized : formatOptimizedTAC(optResult.optimized),
    formattedOriginal  : formatTAC(quads),
    success            : true,
  };

  // ── Phase 6: Code Generation (consumes OPTIMIZED TAC) ──────────────────────
  const livenessData  = optResult.liveness || [];
  const { asm, allocResult, descLog } = generatePseudoAssembly(optResult.optimized, livenessData);
  const jsFromTAC     = generateJSFromTAC(optResult.optimized);
  const jsFromAST     = generateCode(parseResult.ast);           // reference comparison
  const transSteps    = explainTranslation(parseResult.ast);

  result.phases.codeGen = {
    pseudoAsm        : asm,
    registerAlloc    : allocResult,
    descriptorLog    : descLog,
    jsFromTAC,                   // ← new: from optimized TAC
    jsFromAST,                   // ← reference: from AST (for comparison)
    translationSteps : transSteps,
    success          : true,
  };

  result.generatedCode = jsFromTAC;
  result.success       = true;
  return result;
}

export function buildHistoryEntry(source, compileResult) {
  return {
    source,
    success          : compileResult.success,
    errors           : compileResult.errors,
    warnings         : compileResult.warnings,
    tokenCount       : compileResult.phases.lexer?.tokens?.length || 0,
    tacCount         : compileResult.phases.tac?.quadruples?.length || 0,
    optimizedCount   : compileResult.phases.optimizer?.optimizedCount || 0,
    transformations  : compileResult.phases.optimizer?.transformations?.length || 0,
    asmLines         : compileResult.phases.codeGen?.pseudoAsm?.length || 0,
  };
}
