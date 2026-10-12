/**
 * ============================================================
 * astVisualizer.js — AST & Parse Tree Visualization
 * ============================================================
 *
 * CONCEPTS COVERED:
 *  1. Parse Tree vs AST — both rendered separately
 *  2. AST node classification for color-coding
 *  3. Recursive tree layout algorithm
 *
 * DOCUMENTATION:
 *  File    : src/compiler/astVisualizer.js
 *  Depends : parser.js (NodeType, ParseTreeNodeType)
 *  Used by : PhaseViews.jsx (ASTView)
 *  Exports : astToDisplayTree(), parseTreeToDisplayTree()
 * ============================================================
 */
import { NodeType, ParseTreeNodeType } from './parser';

const NODE_COLORS = {
  rule       : '#818cf8',
  logic      : '#34d399',
  operator   : '#fbbf24',
  arithmetic : '#fb923c',
  identifier : '#34d399',
  literal    : '#a78bfa',
  action     : '#f472b6',
  keyword    : '#64748b',
  unknown    : '#94a3b8',
};

// ─── AST → display tree ───────────────────────────────────────────────────────
export function astToDisplayTree(node) {
  if (!node) return null;
  switch (node.type) {
    case NodeType.RULE:
      return { label: 'RULE', nodeType: 'rule', color: NODE_COLORS.rule,
        children: [astToDisplayTree(node.condition), astToDisplayTree(node.action)].filter(Boolean) };
    case NodeType.AND:
      return { label: 'AND', nodeType: 'logic', color: NODE_COLORS.logic,
        children: [astToDisplayTree(node.left), astToDisplayTree(node.right)].filter(Boolean) };
    case NodeType.OR:
      return { label: 'OR', nodeType: 'logic', color: NODE_COLORS.logic,
        children: [astToDisplayTree(node.left), astToDisplayTree(node.right)].filter(Boolean) };
    case NodeType.NOT:
      return { label: 'NOT', nodeType: 'logic', color: NODE_COLORS.logic,
        children: [astToDisplayTree(node.operand)].filter(Boolean) };
    case NodeType.COMPARISON:
      return { label: node.operator, nodeType: 'operator', color: NODE_COLORS.operator,
        children: [astToDisplayTree(node.left), astToDisplayTree(node.right)].filter(Boolean) };
    case NodeType.BINARY_OP:
      return { label: node.operator, nodeType: 'arithmetic', color: NODE_COLORS.arithmetic,
        children: [astToDisplayTree(node.left), astToDisplayTree(node.right)].filter(Boolean) };
    case NodeType.IDENTIFIER:
      return { label: node.name, nodeType: 'identifier', color: NODE_COLORS.identifier, children: [] };
    case NodeType.NUMBER:
      return { label: String(node.value), nodeType: 'literal', color: NODE_COLORS.literal, children: [] };
    case NodeType.STRING:
      return { label: `"${node.value}"`, nodeType: 'literal', color: NODE_COLORS.literal, children: [] };
    case NodeType.BOOLEAN:
      return { label: String(node.value), nodeType: 'literal', color: NODE_COLORS.literal, children: [] };
    case NodeType.ACTION:
      return { label: `${node.target} =`, nodeType: 'action', color: NODE_COLORS.action,
        children: [astToDisplayTree(node.value)].filter(Boolean) };
    default:
      return { label: node.type || '?', nodeType: 'unknown', color: NODE_COLORS.unknown, children: [] };
  }
}

// ─── Parse Tree → display tree ────────────────────────────────────────────────
export function parseTreeToDisplayTree(ptNode) {
  if (!ptNode) return null;
  const typeColor = {
    [ParseTreeNodeType.RULE]       : '#818cf8',
    [ParseTreeNodeType.CONDITION]  : '#6366f1',
    [ParseTreeNodeType.OR_EXPR]    : '#34d399',
    [ParseTreeNodeType.AND_EXPR]   : '#10b981',
    [ParseTreeNodeType.NOT_EXPR]   : '#f472b6',
    [ParseTreeNodeType.COMPARISON] : '#fbbf24',
    [ParseTreeNodeType.EXPRESSION] : '#fb923c',
    [ParseTreeNodeType.TERM]       : '#f97316',
    [ParseTreeNodeType.FACTOR]     : '#a78bfa',
    [ParseTreeNodeType.ACTION]     : '#ec4899',
    [ParseTreeNodeType.TOKEN]      : '#64748b',
  };
  return {
    label   : ptNode.label,
    nodeType: ptNode.type,
    color   : typeColor[ptNode.type] || '#94a3b8',
    isLeaf  : ptNode.type === ParseTreeNodeType.TOKEN,
    children: (ptNode.children || []).map(parseTreeToDisplayTree).filter(Boolean),
  };
}
