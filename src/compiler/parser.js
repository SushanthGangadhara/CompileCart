/**
 * ============================================================
 * parser.js — Phase 2: Syntax Analysis
 * ============================================================
 *
 * CONCEPTS COVERED:
 *  1. Context-Free Grammar (CFG) — BNF production rules
 *  2. FIRST and FOLLOW sets — computed for every non-terminal
 *  3. LL(1) Parsing Table — derived from FIRST/FOLLOW
 *  4. Recursive-Descent Parser — one function per non-terminal
 *  5. Parse Tree Construction — full concrete syntax tree BEFORE AST
 *  6. AST Construction — pruned abstract tree from parse tree
 *  7. Operator Precedence via grammar layering
 *  8. Error reporting with line/column information
 *
 * DOCUMENTATION:
 *  File    : src/compiler/parser.js
 *  Depends : lexer.js (TokenType, Token)
 *  Used by : compiler.js (Phase 2 step)
 *  Exports : parse(), NodeType, GRAMMAR_RULES, FIRST_SETS,
 *            FOLLOW_SETS, LL1_TABLE, ParseError
 * ============================================================
 */

import { TokenType } from './lexer';

// ─── Error class ──────────────────────────────────────────────────────────────
export class ParseError {
  constructor(message, line, col) {
    this.message = message;
    this.line    = line;
    this.col     = col;
  }
  toString() {
    return `Syntax Error at line ${this.line}, col ${this.col}: ${this.message}`;
  }
}

// ─── AST Node types ───────────────────────────────────────────────────────────
export const NodeType = {
  RULE       : 'RULE',
  OR         : 'OR',
  AND        : 'AND',
  NOT        : 'NOT',
  COMPARISON : 'COMPARISON',
  BINARY_OP  : 'BINARY_OP',
  IDENTIFIER : 'IDENTIFIER',
  NUMBER     : 'NUMBER',
  STRING     : 'STRING',
  BOOLEAN    : 'BOOLEAN',
  ACTION     : 'ACTION',
};

// ─── Parse Tree Node types (concrete — one per grammar rule) ──────────────────
export const ParseTreeNodeType = {
  RULE        : 'RULE',
  CONDITION   : 'CONDITION',
  OR_EXPR     : 'OR_EXPR',
  AND_EXPR    : 'AND_EXPR',
  NOT_EXPR    : 'NOT_EXPR',
  COMPARISON  : 'COMPARISON',
  EXPRESSION  : 'EXPRESSION',
  TERM        : 'TERM',
  FACTOR      : 'FACTOR',
  ACTION      : 'ACTION',
  TOKEN       : 'TOKEN',   // leaf — actual token
};

// ─── Grammar specification ────────────────────────────────────────────────────
/**
 * CONCEPT: Context-Free Grammar (CFG) in BNF notation
 *
 * A CFG is a 4-tuple G = (V, Σ, R, S) where
 *   V  = non-terminals (upper-case below)
 *   Σ  = terminals     (lower-case / quoted)
 *   R  = production rules
 *   S  = start symbol (RULE)
 *
 * This grammar is LL(1): for every non-terminal and every lookahead
 * token, at most one production applies.
 */
export const GRAMMAR_RULES = [
  { id: 'G1',  lhs: 'RULE',       rhs: "IF  CONDITION  THEN  ACTION",           note: "Start symbol — top-level rule structure" },
  { id: 'G2',  lhs: 'CONDITION',  rhs: "OR_EXPR",                               note: "Condition delegates to OR_EXPR" },
  { id: 'G3',  lhs: 'OR_EXPR',    rhs: "AND_EXPR  ( OR  AND_EXPR )*",           note: "Left-associative OR chain" },
  { id: 'G4',  lhs: 'AND_EXPR',   rhs: "NOT_EXPR  ( AND  NOT_EXPR )*",          note: "Left-associative AND chain" },
  { id: 'G5',  lhs: 'NOT_EXPR',   rhs: "NOT  NOT_EXPR  |  COMPARISON",          note: "Unary NOT (right-associative)" },
  { id: 'G6',  lhs: 'COMPARISON', rhs: "EXPRESSION  REL_OP  EXPRESSION  |  EXPRESSION", note: "Relational expression or plain expression" },
  { id: 'G7',  lhs: 'EXPRESSION', rhs: "TERM  ( ( + | - )  TERM )*",           note: "Additive level" },
  { id: 'G8',  lhs: 'TERM',       rhs: "FACTOR  ( ( * | / )  FACTOR )*",       note: "Multiplicative level" },
  { id: 'G9',  lhs: 'FACTOR',     rhs: "NUMBER  |  STRING  |  BOOLEAN  |  IDENTIFIER  |  ( CONDITION )", note: "Atomic operands" },
  { id: 'G10', lhs: 'REL_OP',     rhs: "> | < | >= | <= | = | !=",             note: "All relational operators" },
  { id: 'G11', lhs: 'ACTION',     rhs: "IDENTIFIER  =  EXPRESSION",            note: "Assignment action (THEN clause)" },
];

// ─── FIRST sets ───────────────────────────────────────────────────────────────
/**
 * CONCEPT: FIRST(α)
 *
 * FIRST(α) = set of terminals that can begin any string derived from α.
 * If α can derive ε (empty), then ε ∈ FIRST(α).
 *
 * Algorithm (for a single non-terminal X):
 *   1. If X is a terminal, FIRST(X) = {X}
 *   2. If X → ε, add ε to FIRST(X)
 *   3. If X → Y1 Y2 … Yk
 *        add FIRST(Y1) \ {ε} to FIRST(X)
 *        if ε ∈ FIRST(Y1), add FIRST(Y2) \ {ε}, and so on
 *        if ε ∈ FIRST(Yi) for all i, add ε to FIRST(X)
 */
export const FIRST_SETS = {
  RULE       : ['IF'],
  CONDITION  : ['NOT', 'IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  OR_EXPR    : ['NOT', 'IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  AND_EXPR   : ['NOT', 'IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  NOT_EXPR   : ['NOT', 'IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  COMPARISON : ['IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  EXPRESSION : ['IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  TERM       : ['IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  FACTOR     : ['IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  REL_OP     : ['>', '<', '>=', '<=', '=', '!='],
  ACTION     : ['IDENTIFIER'],
};

// ─── FOLLOW sets ──────────────────────────────────────────────────────────────
/**
 * CONCEPT: FOLLOW(A)
 *
 * FOLLOW(A) = set of terminals that can appear immediately to the right
 * of A in any sentential form.  $ (end-of-input) is added to FOLLOW(S).
 *
 * Algorithm:
 *   1. Place $ in FOLLOW(S) (start symbol)
 *   2. For each production A → αBβ:
 *        add FIRST(β) \ {ε} to FOLLOW(B)
 *        if ε ∈ FIRST(β), add FOLLOW(A) to FOLLOW(B)
 *   3. For each production A → αB:
 *        add FOLLOW(A) to FOLLOW(B)
 */
export const FOLLOW_SETS = {
  RULE       : ['$'],
  CONDITION  : ['THEN', ')', '$'],
  OR_EXPR    : ['THEN', ')', '$'],
  AND_EXPR   : ['OR', 'THEN', ')', '$'],
  NOT_EXPR   : ['AND', 'OR', 'THEN', ')', '$'],
  COMPARISON : ['AND', 'OR', 'THEN', ')', '$'],
  EXPRESSION : ['>', '<', '>=', '<=', '=', '!=', 'AND', 'OR', 'THEN', ')', '$'],
  TERM       : ['+', '-', '>', '<', '>=', '<=', '=', '!=', 'AND', 'OR', 'THEN', ')', '$'],
  FACTOR     : ['*', '/', '+', '-', '>', '<', '>=', '<=', '=', '!=', 'AND', 'OR', 'THEN', ')', '$'],
  REL_OP     : ['IDENTIFIER', 'NUMBER', 'STRING', 'BOOLEAN', '('],
  ACTION     : ['$'],
};

// ─── LL(1) Parsing Table ──────────────────────────────────────────────────────
/**
 * CONCEPT: LL(1) Parsing Table M[A, a]
 *
 * Construction:
 *   For each production A → α:
 *     For each terminal a ∈ FIRST(α): M[A, a] = A → α
 *     If ε ∈ FIRST(α): for each b ∈ FOLLOW(A): M[A, b] = A → α
 *
 * M[A, a] = production rule to apply when we are trying to expand
 * non-terminal A and the current lookahead token is a.
 *
 * We represent the table as a human-readable array for UI display.
 * Rows = non-terminals, Columns = lookahead tokens.
 */
export const LL1_TABLE = [
  { nonTerminal: 'RULE',       lookahead: 'IF',         production: 'IF CONDITION THEN ACTION',    ruleId: 'G1'  },
  { nonTerminal: 'CONDITION',  lookahead: 'NOT',         production: 'OR_EXPR',                     ruleId: 'G2'  },
  { nonTerminal: 'CONDITION',  lookahead: 'IDENTIFIER',  production: 'OR_EXPR',                     ruleId: 'G2'  },
  { nonTerminal: 'CONDITION',  lookahead: 'NUMBER',      production: 'OR_EXPR',                     ruleId: 'G2'  },
  { nonTerminal: 'CONDITION',  lookahead: '(',           production: 'OR_EXPR',                     ruleId: 'G2'  },
  { nonTerminal: 'OR_EXPR',    lookahead: 'IDENTIFIER',  production: 'AND_EXPR (OR AND_EXPR)*',     ruleId: 'G3'  },
  { nonTerminal: 'OR_EXPR',    lookahead: 'NOT',         production: 'AND_EXPR (OR AND_EXPR)*',     ruleId: 'G3'  },
  { nonTerminal: 'AND_EXPR',   lookahead: 'IDENTIFIER',  production: 'NOT_EXPR (AND NOT_EXPR)*',   ruleId: 'G4'  },
  { nonTerminal: 'AND_EXPR',   lookahead: 'NOT',         production: 'NOT_EXPR (AND NOT_EXPR)*',   ruleId: 'G4'  },
  { nonTerminal: 'NOT_EXPR',   lookahead: 'NOT',         production: 'NOT NOT_EXPR',                ruleId: 'G5a' },
  { nonTerminal: 'NOT_EXPR',   lookahead: 'IDENTIFIER',  production: 'COMPARISON',                  ruleId: 'G5b' },
  { nonTerminal: 'NOT_EXPR',   lookahead: 'NUMBER',      production: 'COMPARISON',                  ruleId: 'G5b' },
  { nonTerminal: 'COMPARISON', lookahead: 'IDENTIFIER',  production: 'EXPRESSION REL_OP EXPRESSION', ruleId: 'G6' },
  { nonTerminal: 'COMPARISON', lookahead: 'NUMBER',      production: 'EXPRESSION REL_OP EXPRESSION', ruleId: 'G6' },
  { nonTerminal: 'EXPRESSION', lookahead: 'IDENTIFIER',  production: 'TERM ((+|-) TERM)*',          ruleId: 'G7'  },
  { nonTerminal: 'EXPRESSION', lookahead: 'NUMBER',      production: 'TERM ((+|-) TERM)*',          ruleId: 'G7'  },
  { nonTerminal: 'TERM',       lookahead: 'IDENTIFIER',  production: 'FACTOR ((*|/) FACTOR)*',      ruleId: 'G8'  },
  { nonTerminal: 'TERM',       lookahead: 'NUMBER',      production: 'FACTOR ((*|/) FACTOR)*',      ruleId: 'G8'  },
  { nonTerminal: 'FACTOR',     lookahead: 'IDENTIFIER',  production: 'IDENTIFIER',                  ruleId: 'G9a' },
  { nonTerminal: 'FACTOR',     lookahead: 'NUMBER',      production: 'NUMBER',                      ruleId: 'G9b' },
  { nonTerminal: 'FACTOR',     lookahead: 'STRING',      production: 'STRING',                      ruleId: 'G9c' },
  { nonTerminal: 'FACTOR',     lookahead: 'BOOLEAN',     production: 'BOOLEAN',                     ruleId: 'G9d' },
  { nonTerminal: 'FACTOR',     lookahead: '(',           production: '( CONDITION )',                ruleId: 'G9e' },
  { nonTerminal: 'ACTION',     lookahead: 'IDENTIFIER',  production: 'IDENTIFIER = EXPRESSION',     ruleId: 'G11' },
];

// ─── Parse Tree Node factory ──────────────────────────────────────────────────
function ptNode(type, label, children = [], token = null) {
  return { nodeClass: 'PARSE_TREE', type, label, children, token };
}

function astNode(type, props = {}) {
  return { nodeClass: 'AST', type, ...props };
}

// ─── Recursive-Descent Parser ─────────────────────────────────────────────────
/**
 * CONCEPT: Recursive-Descent Parsing
 *
 * Each non-terminal in the grammar becomes one method.
 * The method:
 *   1. Builds a PARSE TREE node for this non-terminal
 *   2. Returns an AST node (pruned/restructured)
 *   3. Records a trace step for educational display
 *
 * The parser is LL(1): it looks at exactly ONE lookahead token to
 * decide which production to apply (using the LL1_TABLE above).
 */
class Parser {
  constructor(tokens) {
    // Filter out NEWLINE and UNKNOWN tokens for parsing
    this.tokens  = tokens.filter(t =>
      t.type !== TokenType.NEWLINE && t.type !== TokenType.UNKNOWN);
    this.pos     = 0;
    this.errors  = [];
    this.steps   = [];   // parsing trace for educational display
  }

  peek()    { return this.tokens[this.pos] || { type: TokenType.EOF, lexeme: 'EOF', line: 0, col: 0 }; }
  advance() { const t = this.tokens[this.pos]; if (this.pos < this.tokens.length) this.pos++; return t; }
  isAtEnd() { return this.peek().type === TokenType.EOF; }

  log(msg)  { this.steps.push(msg); }

  expect(type, lexeme = null) {
    const t = this.peek();
    if (t.type !== type || (lexeme && t.lexeme !== lexeme)) {
      const expected = lexeme ? `'${lexeme}'` : type;
      this.errors.push(new ParseError(
        `Expected ${expected}, found '${t.lexeme}'`, t.line, t.col));
      return null;
    }
    return this.advance();
  }

  // ── G1: RULE → IF CONDITION THEN ACTION ────────────────────────────────────
  parseRule() {
    this.log('parseRule()  [G1: RULE → IF CONDITION THEN ACTION]');
    const ptChildren = [];

    const ifTok = this.expect(TokenType.KEYWORD, 'IF');
    if (!ifTok) return { pt: null, ast: null };
    ptChildren.push(ptNode(ParseTreeNodeType.TOKEN, 'IF', [], ifTok));

    this.log('  → parsing CONDITION');
    const { pt: condPT, ast: condAST } = this.parseCondition();
    ptChildren.push(condPT);

    const thenTok = this.expect(TokenType.KEYWORD, 'THEN');
    if (!thenTok) return { pt: null, ast: null };
    ptChildren.push(ptNode(ParseTreeNodeType.TOKEN, 'THEN', [], thenTok));

    this.log('  → parsing ACTION');
    const { pt: actPT, ast: actAST } = this.parseAction();
    ptChildren.push(actPT);

    if (!this.isAtEnd()) {
      const t = this.peek();
      this.errors.push(new ParseError(`Unexpected token '${t.lexeme}' after rule`, t.line, t.col));
    }

    this.log('✓ Rule parsed successfully');
    return {
      pt : ptNode(ParseTreeNodeType.RULE,       'RULE',      ptChildren),
      ast: astNode(NodeType.RULE, { condition: condAST, action: actAST }),
    };
  }

  // ── G2: CONDITION → OR_EXPR ────────────────────────────────────────────────
  parseCondition() {
    this.log('parseCondition()  [G2: CONDITION → OR_EXPR]');
    const { pt, ast } = this.parseOrExpr();
    return {
      pt : ptNode(ParseTreeNodeType.CONDITION, 'CONDITION', [pt]),
      ast,
    };
  }

  // ── G3: OR_EXPR → AND_EXPR (OR AND_EXPR)* ─────────────────────────────────
  parseOrExpr() {
    this.log('parseOrExpr()  [G3: OR_EXPR → AND_EXPR (OR AND_EXPR)*]');
    const ptChildren = [];

    let { pt: leftPT, ast: leftAST } = this.parseAndExpr();
    ptChildren.push(leftPT);

    while (!this.isAtEnd() &&
           this.peek().type === TokenType.KEYWORD &&
           this.peek().lexeme === 'OR') {
      const opTok = this.advance();
      this.log('    found OR');
      ptChildren.push(ptNode(ParseTreeNodeType.TOKEN, 'OR', [], opTok));

      const { pt: rightPT, ast: rightAST } = this.parseAndExpr();
      ptChildren.push(rightPT);
      leftAST = astNode(NodeType.OR,  { left: leftAST, right: rightAST, op: opTok });
    }

    return {
      pt : ptNode(ParseTreeNodeType.OR_EXPR, 'OR_EXPR', ptChildren),
      ast: leftAST,
    };
  }

  // ── G4: AND_EXPR → NOT_EXPR (AND NOT_EXPR)* ───────────────────────────────
  parseAndExpr() {
    this.log('parseAndExpr()  [G4: AND_EXPR → NOT_EXPR (AND NOT_EXPR)*]');
    const ptChildren = [];

    let { pt: leftPT, ast: leftAST } = this.parseNotExpr();
    ptChildren.push(leftPT);

    while (!this.isAtEnd() &&
           this.peek().type === TokenType.KEYWORD &&
           this.peek().lexeme === 'AND') {
      const opTok = this.advance();
      this.log('    found AND');
      ptChildren.push(ptNode(ParseTreeNodeType.TOKEN, 'AND', [], opTok));

      const { pt: rightPT, ast: rightAST } = this.parseNotExpr();
      ptChildren.push(rightPT);
      leftAST = astNode(NodeType.AND, { left: leftAST, right: rightAST, op: opTok });
    }

    return {
      pt : ptNode(ParseTreeNodeType.AND_EXPR, 'AND_EXPR', ptChildren),
      ast: leftAST,
    };
  }

  // ── G5: NOT_EXPR → NOT NOT_EXPR | COMPARISON ──────────────────────────────
  parseNotExpr() {
    if (this.peek().type === TokenType.KEYWORD && this.peek().lexeme === 'NOT') {
      this.log('parseNotExpr()  [G5a: NOT_EXPR → NOT NOT_EXPR]');
      const opTok = this.advance();
      const { pt: operandPT, ast: operandAST } = this.parseNotExpr();
      return {
        pt : ptNode(ParseTreeNodeType.NOT_EXPR, 'NOT_EXPR',
               [ptNode(ParseTreeNodeType.TOKEN, 'NOT', [], opTok), operandPT]),
        ast: astNode(NodeType.NOT, { operand: operandAST, op: opTok }),
      };
    }
    this.log('parseNotExpr()  [G5b: NOT_EXPR → COMPARISON]');
    const { pt, ast } = this.parseComparison();
    return {
      pt : ptNode(ParseTreeNodeType.NOT_EXPR, 'NOT_EXPR', [pt]),
      ast,
    };
  }

  // ── G6: COMPARISON → EXPRESSION REL_OP EXPRESSION | EXPRESSION ────────────
  parseComparison() {
    this.log('parseComparison()  [G6: COMPARISON → EXPRESSION [REL_OP EXPRESSION]]');
    const ptChildren = [];

    const { pt: leftPT, ast: leftAST } = this.parseExpression();
    ptChildren.push(leftPT);

    const t = this.peek();
    if (t.type === TokenType.OPERATOR) {
      const opTok = this.advance();
      this.log(`    rel-op: '${opTok.lexeme}'`);
      ptChildren.push(ptNode(ParseTreeNodeType.TOKEN, opTok.lexeme, [], opTok));

      const { pt: rightPT, ast: rightAST } = this.parseExpression();
      ptChildren.push(rightPT);

      return {
        pt : ptNode(ParseTreeNodeType.COMPARISON, 'COMPARISON', ptChildren),
        ast: astNode(NodeType.COMPARISON,
               { left: leftAST, right: rightAST, operator: opTok.lexeme, op: opTok }),
      };
    }

    return {
      pt : ptNode(ParseTreeNodeType.COMPARISON, 'COMPARISON', ptChildren),
      ast: leftAST,
    };
  }

  // ── G7: EXPRESSION → TERM ((+|-) TERM)* ───────────────────────────────────
  parseExpression() {
    this.log('parseExpression()  [G7: EXPRESSION → TERM ((+|-) TERM)*]');
    const ptChildren = [];

    let { pt: leftPT, ast: leftAST } = this.parseTerm();
    ptChildren.push(leftPT);

    while (!this.isAtEnd() &&
           this.peek().type === TokenType.OPERATOR &&
           ['+', '-'].includes(this.peek().lexeme)) {
      const opTok = this.advance();
      ptChildren.push(ptNode(ParseTreeNodeType.TOKEN, opTok.lexeme, [], opTok));
      const { pt: rightPT, ast: rightAST } = this.parseTerm();
      ptChildren.push(rightPT);
      leftAST = astNode(NodeType.BINARY_OP, { left: leftAST, right: rightAST, operator: opTok.lexeme });
    }

    return {
      pt : ptNode(ParseTreeNodeType.EXPRESSION, 'EXPRESSION', ptChildren),
      ast: leftAST,
    };
  }

  // ── G8: TERM → FACTOR ((*|/) FACTOR)* ─────────────────────────────────────
  parseTerm() {
    this.log('parseTerm()  [G8: TERM → FACTOR ((*|/) FACTOR)*]');
    const ptChildren = [];

    let { pt: leftPT, ast: leftAST } = this.parseFactor();
    ptChildren.push(leftPT);

    while (!this.isAtEnd() &&
           this.peek().type === TokenType.OPERATOR &&
           ['*', '/'].includes(this.peek().lexeme)) {
      const opTok = this.advance();
      ptChildren.push(ptNode(ParseTreeNodeType.TOKEN, opTok.lexeme, [], opTok));
      const { pt: rightPT, ast: rightAST } = this.parseFactor();
      ptChildren.push(rightPT);
      leftAST = astNode(NodeType.BINARY_OP, { left: leftAST, right: rightAST, operator: opTok.lexeme });
    }

    return {
      pt : ptNode(ParseTreeNodeType.TERM, 'TERM', ptChildren),
      ast: leftAST,
    };
  }

  // ── G9: FACTOR → NUMBER | STRING | BOOLEAN | IDENTIFIER | ( CONDITION ) ───
  parseFactor() {
    const t = this.peek();
    this.log(`parseFactor()  [G9] lookahead='${t.lexeme}'`);

    if (t.type === TokenType.NUMBER) {
      this.advance();
      return {
        pt : ptNode(ParseTreeNodeType.FACTOR, 'FACTOR',
               [ptNode(ParseTreeNodeType.TOKEN, t.lexeme, [], t)]),
        ast: astNode(NodeType.NUMBER, { value: t.value, token: t }),
      };
    }
    if (t.type === TokenType.STRING) {
      this.advance();
      return {
        pt : ptNode(ParseTreeNodeType.FACTOR, 'FACTOR',
               [ptNode(ParseTreeNodeType.TOKEN, t.lexeme, [], t)]),
        ast: astNode(NodeType.STRING, { value: t.value, token: t }),
      };
    }
    if (t.type === TokenType.BOOLEAN) {
      this.advance();
      return {
        pt : ptNode(ParseTreeNodeType.FACTOR, 'FACTOR',
               [ptNode(ParseTreeNodeType.TOKEN, t.lexeme, [], t)]),
        ast: astNode(NodeType.BOOLEAN, { value: t.value, token: t }),
      };
    }
    if (t.type === TokenType.IDENTIFIER) {
      this.advance();
      return {
        pt : ptNode(ParseTreeNodeType.FACTOR, 'FACTOR',
               [ptNode(ParseTreeNodeType.TOKEN, t.lexeme, [], t)]),
        ast: astNode(NodeType.IDENTIFIER, { name: t.lexeme, token: t }),
      };
    }
    if (t.type === TokenType.LPAREN) {
      this.advance();
      this.log('  entering parenthesised expression');
      const { pt: innerPT, ast: innerAST } = this.parseCondition();
      const rp = this.expect(TokenType.RPAREN);
      return {
        pt : ptNode(ParseTreeNodeType.FACTOR, 'FACTOR',
               [ptNode(ParseTreeNodeType.TOKEN, '(', []),
                innerPT,
                ptNode(ParseTreeNodeType.TOKEN, ')', [])]),
        ast: innerAST,
      };
    }

    // Error recovery — emit a dummy node and continue
    this.errors.push(new ParseError(
      `Unexpected token '${t.lexeme}' in expression`, t.line, t.col));
    this.advance();
    return {
      pt : ptNode(ParseTreeNodeType.FACTOR, 'FACTOR', []),
      ast: astNode(NodeType.NUMBER, { value: 0, token: t }),
    };
  }

  // ── G11: ACTION → IDENTIFIER = EXPRESSION ─────────────────────────────────
  parseAction() {
    this.log('parseAction()  [G11: ACTION → IDENTIFIER = EXPRESSION]');
    const id = this.peek();
    if (id.type !== TokenType.IDENTIFIER) {
      this.errors.push(new ParseError(
        `Expected action target identifier, found '${id.lexeme}'`, id.line, id.col));
      return { pt: ptNode(ParseTreeNodeType.ACTION, 'ACTION', []), ast: null };
    }

    const ACTION_TARGETS = new Set(['discount','shipping','price']);
    if (!ACTION_TARGETS.has(id.lexeme)) {
      this.errors.push(new ParseError(
        `'${id.lexeme}' is not a valid action target. Use: discount, shipping, price`,
        id.line, id.col));
    }
    this.advance();

    const eq = this.expect(TokenType.OPERATOR, '=');
    if (!eq) return { pt: ptNode(ParseTreeNodeType.ACTION, 'ACTION', []), ast: null };

    const { pt: valPT, ast: valAST } = this.parseExpression();
    this.log(`  action target: '${id.lexeme}'`);

    return {
      pt : ptNode(ParseTreeNodeType.ACTION, 'ACTION', [
        ptNode(ParseTreeNodeType.TOKEN, id.lexeme, [], id),
        ptNode(ParseTreeNodeType.TOKEN, '=', [], eq),
        valPT,
      ]),
      ast: astNode(NodeType.ACTION, { target: id.lexeme, value: valAST, token: id }),
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function parse(tokens) {
  const parser = new Parser(tokens);
  const { pt, ast } = parser.parseRule();
  return {
    parseTree : pt,   // ← full concrete parse tree
    ast       : ast,  // ← pruned abstract syntax tree
    errors    : parser.errors,
    steps     : parser.steps,
  };
}
