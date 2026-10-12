/**
 * executor.js — Phase 7: Safe Execution (AST Interpreter)
 *
 * CONCEPT: Tree-walking interpreter.
 * Evaluates the validated AST against a business context object.
 * NEVER uses eval() or new Function(). All evaluation is explicit.
 */
import { NodeType } from './parser';

export class ExecutionError {
  constructor(message) { this.message = message; }
  toString() { return `Execution Error: ${this.message}`; }
}

function evalNode(node, ctx) {
  if (!node) throw new ExecutionError('Null AST node');
  switch (node.type) {
    case NodeType.NUMBER:  return node.value;
    case NodeType.STRING:  return node.value;
    case NodeType.BOOLEAN: return node.value;
    case NodeType.IDENTIFIER: {
      if (!(node.name in ctx)) throw new ExecutionError(`'${node.name}' not in context`);
      return ctx[node.name];
    }
    case NodeType.BINARY_OP: {
      const l = evalNode(node.left, ctx), r = evalNode(node.right, ctx);
      switch (node.operator) {
        case '+': return l + r; case '-': return l - r;
        case '*': return l * r; case '/': return r !== 0 ? l / r : 0;
        default: throw new ExecutionError(`Unknown operator '${node.operator}'`);
      }
    }
    case NodeType.COMPARISON: {
      const l = evalNode(node.left, ctx), r = evalNode(node.right, ctx);
      switch (node.operator) {
        case '>':  return l > r;
        case '<':  return l < r;
        case '>=': return l >= r;
        case '<=': return l <= r;
        case '=':  return l === r || String(l).toLowerCase() === String(r).toLowerCase();
        case '!=': return !(l === r || String(l).toLowerCase() === String(r).toLowerCase());
        default: throw new ExecutionError(`Unknown operator '${node.operator}'`);
      }
    }
    case NodeType.AND: return evalNode(node.left, ctx) && evalNode(node.right, ctx);
    case NodeType.OR:  return evalNode(node.left, ctx) || evalNode(node.right, ctx);
    case NodeType.NOT: return !evalNode(node.operand, ctx);
    case NodeType.ACTION: {
      const val = evalNode(node.value, ctx);
      ctx[node.target] = val;
      return val;
    }
    case NodeType.RULE: {
      const condResult = evalNode(node.condition, ctx);
      if (condResult && node.action) {
        const val = evalNode(node.action.value, ctx);
        ctx[node.action.target] = val;
        return { conditionMet: true, action: { target: node.action.target, value: val } };
      }
      return { conditionMet: false, action: null };
    }
    default: throw new ExecutionError(`Unknown node type '${node.type}'`);
  }
}

export function executeRule(ast, context) {
  const ctx = { discount: 0, shipping: 100, ...context };
  try {
    const result = evalNode(ast, ctx);
    return { conditionMet: result.conditionMet, action: result.action, context: ctx, error: null };
  } catch (e) {
    return { conditionMet: false, action: null, context: ctx,
      error: e instanceof ExecutionError ? e.message : String(e) };
  }
}

export function applyActiveRules(rules, cartContext) {
  const ctx     = { discount: 0, shipping: 100, ...cartContext };
  const applied = [];
  for (const rule of rules) {
    if (!rule.active || !rule.compiled) continue;
    try {
      const { tokenize }   = require('./lexer');
      const { parse }      = require('./parser');
      const lexResult      = tokenize(rule.source);
      if (lexResult.errors.length) continue;
      const { ast }        = parse(lexResult.tokens);
      if (!ast) continue;
      const result         = evalNode(ast, { ...ctx });
      if (result.conditionMet && result.action) {
        const { target, value } = result.action;
        if (target === 'discount' && value > ctx.discount) { ctx.discount = value; applied.push({ rule: rule.name, action: `discount=${value}%` }); }
        else if (target === 'shipping' && value < ctx.shipping) { ctx.shipping = value; applied.push({ rule: rule.name, action: `shipping=₹${value}` }); }
      }
    } catch (_) { /* skip broken rules silently */ }
  }
  return { ctx, applied };
}
