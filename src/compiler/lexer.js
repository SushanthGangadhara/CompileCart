/**
 * ============================================================
 * lexer.js — Phase 1: Lexical Analysis
 * ============================================================
 *
 * CONCEPTS COVERED:
 *  1. Finite Automata Theory (NFA → DFA subset construction)
 *  2. DFA Transition Table (explicit δ: State × Char → State)
 *  3. Regular Expressions → NFA (Thompson's construction, conceptual)
 *  4. Token Classification (keywords, identifiers, literals, operators)
 *  5. Symbol Table initial population (lexer phase)
 *  6. Lexical error handling with line/column recovery
 *  7. Input buffering and lookahead
 *
 * DOCUMENTATION:
 *  File    : src/compiler/lexer.js
 *  Used by : src/compiler/compiler.js (Phase 1 step)
 *            src/compiler/parser.js   (consumes token stream)
 *  Exports : tokenize(), TokenType, KEYWORDS, Token, LexerError,
 *            DFA_STATES, DFA_TRANSITIONS, NFA_DESCRIPTION
 * ============================================================
 */

// ─── Token Types ─────────────────────────────────────────────────────────────
export const TokenType = {
  KEYWORD    : 'KEYWORD',
  IDENTIFIER : 'IDENTIFIER',
  OPERATOR   : 'OPERATOR',
  NUMBER     : 'NUMBER',
  STRING     : 'STRING',
  BOOLEAN    : 'BOOLEAN',
  LPAREN     : 'LPAREN',
  RPAREN     : 'RPAREN',
  NEWLINE    : 'NEWLINE',
  EOF        : 'EOF',
  UNKNOWN    : 'UNKNOWN',
};

export const KEYWORDS = new Set(['IF','THEN','AND','OR','NOT','TRUE','FALSE']);

export const ALLOWED_IDENTIFIERS = new Set([
  'cart_total','quantity','category','customer_type',
  'coupon','stock','discount','shipping','price',
]);

// ─── Token & Error classes ────────────────────────────────────────────────────
export class Token {
  constructor(type, lexeme, line, col, value = null) {
    this.type   = type;
    this.lexeme = lexeme;
    this.line   = line;
    this.col    = col;
    this.value  = value !== null ? value : lexeme;
  }
}

export class LexerError {
  constructor(message, line, col, lexeme) {
    this.message = message;
    this.line    = line;
    this.col     = col;
    this.lexeme  = lexeme;
  }
  toString() {
    return `Lexical Error at line ${this.line}, col ${this.col}: ${this.message} ('${this.lexeme}')`;
  }
}

// ─── NFA Description (Thompson's Construction — conceptual) ──────────────────
/**
 * CONCEPT: NFA (Non-deterministic Finite Automaton)
 *
 * In the Thompson's construction each regular expression
 * compiles to an NFA fragment with one start and one accept state,
 * connected by ε-transitions.  We describe the NFA for each token
 * class below as a formal record for educational display.
 *
 * NFA fragment schema:
 *   { pattern, states, alphabet, transitions, start, accept, regex }
 *
 * "transitions" entries: [fromState, symbol, toState]
 * symbol = 'ε' means epsilon (free) transition
 */
export const NFA_DESCRIPTION = [
  {
    name    : 'Keyword / Identifier',
    regex   : '[A-Za-z_][A-Za-z0-9_]*',
    states  : ['q0','q1','q2'],
    alphabet: ['letter','digit','_'],
    transitions: [
      ['q0','letter','q1'],['q0','_','q1'],
      ['q1','letter','q1'],['q1','digit','q1'],['q1','_','q1'],
      ['q1','ε','q2'],
    ],
    start  : 'q0',
    accept : ['q2'],
    note   : 'After scanning the word, check KEYWORDS set. If found → KEYWORD token, else IDENTIFIER.',
  },
  {
    name    : 'Integer / Float Literal',
    regex   : '[0-9]+(\\.[0-9]+)?',
    states  : ['q0','q1','q2','q3','q4'],
    alphabet: ['digit','.'],
    transitions: [
      ['q0','digit','q1'],
      ['q1','digit','q1'],['q1','.','q2'],['q1','ε','q4'],
      ['q2','digit','q3'],
      ['q3','digit','q3'],['q3','ε','q4'],
    ],
    start  : 'q0',
    accept : ['q4'],
    note   : 'q4 is the accept state; q2 requires at least one digit after the decimal point.',
  },
  {
    name    : 'String Literal',
    regex   : '"[^"\\n]*"',
    states  : ['q0','q1','q2'],
    alphabet: ['"','char'],
    transitions: [
      ['q0','"','q1'],
      ['q1','char','q1'],
      ['q1','"','q2'],
    ],
    start  : 'q0',
    accept : ['q2'],
    note   : 'Hitting \\n before closing quote is a lexical error (unterminated string).',
  },
  {
    name    : 'Relational Operators',
    regex   : '>=|<=|!=|>|<|=',
    states  : ['q0','q1','q2'],
    alphabet: ['>','<','=','!'],
    transitions: [
      ['q0','>','q1'],['q0','<','q1'],['q0','!','q1'],['q0','=','q2'],
      ['q1','=','q2'],['q1','ε','q2'],
    ],
    start  : 'q0',
    accept : ['q2'],
    note   : 'Two-character operators are recognised by one-character lookahead (maximal munch).',
  },
];

// ─── DFA States & Transition Table ───────────────────────────────────────────
/**
 * CONCEPT: DFA (Deterministic Finite Automaton)
 *
 * The NFA fragments above are merged and converted to a DFA via the
 * subset-construction algorithm.  The combined DFA for our lexer
 * has the following state space (we give symbolic names):
 *
 *   START      — initial state, nothing consumed yet
 *   IN_WORD    — consumed ≥1 letter/underscore (identifier or keyword in progress)
 *   IN_NUMBER  — consumed ≥1 digit
 *   IN_FLOAT   — consumed decimal point after digits
 *   IN_FLOAT_D — consumed ≥1 digit after decimal point
 *   IN_STRING  — inside a string literal (consumed opening quote)
 *   IN_OP1     — consumed first char of a potential two-char operator (>, <, !)
 *   ACCEPT     — final accept (token complete; scanner backs up if needed)
 *   ERROR      — illegal character detected
 *
 * δ(state, charClass) → nextState  (shown as a 2-D table below)
 *
 * charClass abbreviations:
 *   L=letter  D=digit  _=underscore  "=quote  .=dot
 *   >=gt  <=lt  ==eq  !=bang  (=lparen  )=rparen
 *   WS=whitespace  NL=newline  OTHER=anything else
 */
export const DFA_STATES = [
  'START','IN_WORD','IN_NUMBER','IN_FLOAT','IN_FLOAT_D',
  'IN_STRING','IN_OP1','ACCEPT','ERROR',
];

/**
 * DFA_TRANSITIONS[state][charClass] → nextState
 * '-' means the current token is complete (emit it) and the char
 *     is NOT consumed (it starts the next token).
 * 'ACCEPT' means consume the char and emit the token.
 * 'ERROR'  means illegal character; emit an error token.
 */
export const DFA_TRANSITIONS = {
  START: {
    L: 'IN_WORD', _: 'IN_WORD',
    D: 'IN_NUMBER',
    '"': 'IN_STRING', "'": 'IN_STRING',
    '>': 'IN_OP1', '<': 'IN_OP1', '!': 'IN_OP1',
    '=': 'ACCEPT',
    '(': 'ACCEPT', ')': 'ACCEPT',
    WS: 'START', NL: 'ACCEPT',
    '/': 'ACCEPT',
    OTHER: 'ERROR',
  },
  IN_WORD: {
    L: 'IN_WORD', _: 'IN_WORD', D: 'IN_WORD',
    OTHER: '-',  // back-up, emit KEYWORD or IDENTIFIER
  },
  IN_NUMBER: {
    D: 'IN_NUMBER',
    '.': 'IN_FLOAT',
    OTHER: '-',  // back-up, emit NUMBER
  },
  IN_FLOAT: {
    D: 'IN_FLOAT_D',
    OTHER: 'ERROR',  // digit required after '.'
  },
  IN_FLOAT_D: {
    D: 'IN_FLOAT_D',
    OTHER: '-',  // back-up, emit NUMBER (float)
  },
  IN_STRING: {
    '"': 'ACCEPT',  // emit STRING
    NL: 'ERROR',    // unterminated string
    OTHER: 'IN_STRING',
  },
  IN_OP1: {
    '=': 'ACCEPT',   // emit two-char operator (>=, <=, !=)
    OTHER: '-',       // back-up, emit single-char operator
  },
};

// ─── Hand-written Scanner (DFA implementation) ───────────────────────────────
/**
 * The scanner below is a direct implementation of the DFA described
 * above.  Instead of an explicit state-machine loop (which would
 * require encoding every character class), we use idiomatic checks
 * that are 1-to-1 equivalent to DFA transitions.
 *
 * The key property preserved: MAXIMAL MUNCH — we always consume
 * the longest possible sequence that forms a valid token.
 */
export function tokenize(source) {
  const tokens = [];
  const errors = [];
  // Lexer-phase symbol table: records every identifier seen
  const symbolTableEntries = [];

  let pos       = 0;
  let line      = 1;
  let lineStart = 0;

  const col  = () => pos - lineStart + 1;
  const peek = (offset = 0) => source[pos + offset];
  const advance = () => source[pos++];

  while (pos < source.length) {
    const startPos  = pos;
    const startLine = line;
    const startCol  = col();
    const ch        = peek();

    // ── DFA: START → WS ────────────────────────────────────────────────────
    if (ch === ' ' || ch === '\t' || ch === '\r') { advance(); continue; }

    // ── DFA: START → NL ────────────────────────────────────────────────────
    if (ch === '\n') {
      advance();
      tokens.push(new Token(TokenType.NEWLINE, '\\n', startLine, startCol));
      line++;
      lineStart = pos;
      continue;
    }

    // ── Line comments (//) ─────────────────────────────────────────────────
    if (ch === '/' && peek(1) === '/') {
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // ── DFA: START → IN_STRING ─────────────────────────────────────────────
    if (ch === '"' || ch === "'") {
      const quote = advance();                        // consume opening quote
      let   str   = '';
      // DFA: IN_STRING → IN_STRING (consume chars) | ACCEPT (closing quote)
      while (pos < source.length && peek() !== quote) {
        if (peek() === '\n') {
          errors.push(new LexerError(
            'Unterminated string literal', startLine, startCol, quote + str));
          break;
        }
        str += advance();
      }
      if (pos < source.length) advance();            // consume closing quote
      tokens.push(new Token(TokenType.STRING, `"${str}"`, startLine, startCol, str));
      continue;
    }

    // ── DFA: START → IN_NUMBER ─────────────────────────────────────────────
    if (ch >= '0' && ch <= '9') {
      let num = '';
      // DFA: IN_NUMBER → IN_NUMBER (digits)
      while (pos < source.length && peek() >= '0' && peek() <= '9') num += advance();
      // DFA: IN_NUMBER → IN_FLOAT (dot)
      if (peek() === '.') {
        num += advance();
        // DFA: IN_FLOAT → IN_FLOAT_D (must have at least one digit)
        if (!(peek() >= '0' && peek() <= '9')) {
          errors.push(new LexerError(
            'Expected digit after decimal point', startLine, startCol, num));
        }
        while (pos < source.length && peek() >= '0' && peek() <= '9') num += advance();
      }
      tokens.push(new Token(TokenType.NUMBER, num, startLine, startCol, parseFloat(num)));
      continue;
    }

    // ── DFA: START → IN_OP1 (two-char operators) ──────────────────────────
    const two = ch + (peek(1) || '');
    if (['>=','<=','!='].includes(two)) {
      advance(); advance();
      tokens.push(new Token(TokenType.OPERATOR, two, startLine, startCol));
      continue;
    }
    // Handle == as = (normalise)
    if (two === '==') {
      advance(); advance();
      tokens.push(new Token(TokenType.OPERATOR, '=', startLine, startCol));
      continue;
    }

    // ── DFA: START → ACCEPT (single-char operators) ───────────────────────
    if (['>', '<', '='].includes(ch)) {
      advance();
      tokens.push(new Token(TokenType.OPERATOR, ch, startLine, startCol));
      continue;
    }
    if (ch === '(') { advance(); tokens.push(new Token(TokenType.LPAREN, '(', startLine, startCol)); continue; }
    if (ch === ')') { advance(); tokens.push(new Token(TokenType.RPAREN, ')', startLine, startCol)); continue; }

    // ── DFA: START → IN_WORD (keywords & identifiers) ─────────────────────
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let word = '';
      // DFA: IN_WORD → IN_WORD (letters, digits, underscores)
      while (pos < source.length &&
        ((peek() >= 'a' && peek() <= 'z') || (peek() >= 'A' && peek() <= 'Z') ||
         (peek() >= '0' && peek() <= '9') || peek() === '_')) {
        word += advance();
      }
      // DFA: IN_WORD → ACCEPT (back-up implied; classify)
      const upper = word.toUpperCase();
      if (upper === 'TRUE' || upper === 'FALSE') {
        tokens.push(new Token(TokenType.BOOLEAN, word, startLine, startCol, upper === 'TRUE'));
      } else if (KEYWORDS.has(upper)) {
        tokens.push(new Token(TokenType.KEYWORD, upper, startLine, startCol));
      } else if (ALLOWED_IDENTIFIERS.has(word.toLowerCase())) {
        const id = word.toLowerCase();
        tokens.push(new Token(TokenType.IDENTIFIER, id, startLine, startCol));
        // ── Symbol Table: record identifier occurrence ─────────────────────
        if (!symbolTableEntries.find(e => e.name === id)) {
          symbolTableEntries.push({ name: id, firstLine: startLine, firstCol: startCol });
        }
      } else {
        errors.push(new LexerError(
          `Unknown identifier '${word}'. Allowed: ${[...ALLOWED_IDENTIFIERS].join(', ')}`,
          startLine, startCol, word));
        tokens.push(new Token(TokenType.UNKNOWN, word, startLine, startCol));
      }
      continue;
    }

    // ── DFA: START → ERROR (unrecognised character) ───────────────────────
    advance();
    errors.push(new LexerError(`Unexpected character`, startLine, startCol, ch));
    tokens.push(new Token(TokenType.UNKNOWN, ch, startLine, startCol));
  }

  tokens.push(new Token(TokenType.EOF, 'EOF', line, col()));
  return { tokens, errors, symbolTableEntries };
}
