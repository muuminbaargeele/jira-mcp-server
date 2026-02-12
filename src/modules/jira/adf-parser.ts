/**
 * ADF-to-plain-text parser.
 *
 * Recursively walks an Atlassian Document Format (ADF) tree and produces
 * deterministic plain text. All formatting marks are stripped — only the
 * underlying text content is preserved.
 *
 * Supported marks (all stripped, text content preserved):
 *   strong, em, strike, underline, code, link, textColor,
 *   subsup, backgroundColor, border
 *
 * Unknown or unrecognised node types are silently skipped (FR-010).
 */

import { AdfDocument, AdfNode } from './adf-types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an ADF document into plain text.
 *
 * @param doc - The raw ADF document object (or null/undefined).
 * @returns Deterministic plain-text representation, or `""` if input is
 *          null, undefined, or has no content.
 */
export function parseAdf(doc: AdfDocument | null | undefined): string {
  if (!doc || !doc.content) {
    return '';
  }
  const raw = processNodes(doc.content, { orderedIndex: 0 });
  // Trim trailing whitespace for stability (FR-009).
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface WalkContext {
  orderedIndex: number;
}

function processNodes(nodes: AdfNode[], ctx: WalkContext): string {
  let out = '';
  for (const node of nodes) {
    out += processNode(node, ctx);
  }
  return out;
}

function processNode(node: AdfNode, ctx: WalkContext): string {
  switch (node.type) {
    // ---- Block nodes (top-level) ----
    case 'paragraph':
      return processInlineContainer(node) + '\n\n';

    case 'heading':
      return processInlineContainer(node) + '\n\n';

    case 'bulletList':
      return processList(node, 'bullet', ctx) + '\n';

    case 'orderedList':
      return processList(node, 'ordered', ctx) + '\n';

    case 'codeBlock':
      return processCodeBlock(node);

    case 'blockquote':
      return processBlockquote(node, ctx);

    case 'table':
      return processTable(node) + '\n';

    case 'panel':
      return processPanel(node, ctx);

    case 'rule':
      return '---\n\n';

    case 'expand':
    case 'nestedExpand':
      return processExpand(node, ctx);

    case 'mediaSingle':
    case 'mediaGroup':
      return '[attachment]\n\n';

    // ---- Child block nodes ----
    case 'listItem':
      // listItem is handled by processList; fallback if encountered alone.
      return processInlineContainer(node);

    case 'tableRow':
    case 'tableCell':
    case 'tableHeader':
      // Handled by processTable; fallback.
      return processInlineContainer(node);

    case 'media':
      return '[attachment]';

    // ---- Inline nodes ----
    case 'text':
      // All ADF marks are intentionally stripped (FR-003). The parser
      // extracts only the raw `.text` content, discarding `.marks` entirely.
      //
      // Stripped mark types: strong, em, strike, underline, code, link,
      //   textColor, subsup, backgroundColor, border
      //
      // For "link" marks: the text node's `.text` property contains the
      // display text (which is preserved). The URL in `mark.attrs.href`
      // is discarded — unless `.text` itself is a URL, in which case it
      // naturally remains as the visible content.
      return node.text ?? '';

    case 'hardBreak':
      return '\n';

    case 'mention':
      return `@${node.attrs?.text ?? 'unknown'}`;

    case 'emoji':
      return `:${node.attrs?.shortName ?? 'emoji'}:`;

    case 'date':
      return formatTimestamp(node.attrs?.timestamp);

    case 'status':
      return `[${node.attrs?.text ?? 'STATUS'}]`;

    case 'inlineCard':
      return node.attrs?.url ?? '';

    // ---- Unknown nodes: skip silently (FR-010) ----
    default:
      // If the unknown node has content, try to extract text from children.
      if (node.content) {
        return processNodes(node.content, ctx);
      }
      return '';
  }
}

// ---------------------------------------------------------------------------
// Block-level processors
// ---------------------------------------------------------------------------

/**
 * Extract inline text from a node that contains inline children
 * (paragraph, heading, listItem, tableCell, etc.).
 */
function processInlineContainer(node: AdfNode): string {
  if (!node.content) return '';
  return processNodes(node.content, { orderedIndex: 0 });
}

/**
 * Process a bulletList or orderedList.
 */
function processList(
  node: AdfNode,
  kind: 'bullet' | 'ordered',
  ctx: WalkContext,
): string {
  if (!node.content) return '';
  let out = '';
  let index = 1;
  for (const item of node.content) {
    if (item.type !== 'listItem') continue;
    const prefix = kind === 'bullet' ? '- ' : `${index}. `;
    const text = processListItem(item, ctx);
    out += prefix + text + '\n';
    index++;
  }
  return out;
}

/**
 * Process a single listItem. A listItem may contain paragraphs, nested
 * lists, or other block content.
 */
function processListItem(node: AdfNode, ctx: WalkContext): string {
  if (!node.content) return '';
  const parts: string[] = [];
  for (const child of node.content) {
    if (child.type === 'paragraph') {
      parts.push(processInlineContainer(child));
    } else if (child.type === 'bulletList' || child.type === 'orderedList') {
      // Nested list — indent by adding two spaces to each line.
      const nested = processList(
        child,
        child.type === 'bulletList' ? 'bullet' : 'ordered',
        ctx,
      );
      const indented = nested
        .split('\n')
        .map((line) => (line ? '  ' + line : ''))
        .join('\n');
      parts.push('\n' + indented);
    } else {
      parts.push(processNode(child, ctx));
    }
  }
  return parts.join('').trim();
}

/**
 * Process a codeBlock — fenced with triple backticks.
 */
function processCodeBlock(node: AdfNode): string {
  const lang = node.attrs?.language ?? '';
  const code = extractText(node);
  return '```' + lang + '\n' + code + '\n```\n\n';
}

/**
 * Process a blockquote — each line prefixed with `> `.
 */
function processBlockquote(node: AdfNode, ctx: WalkContext): string {
  if (!node.content) return '';
  const inner = processNodes(node.content, ctx).trim();
  const quoted = inner
    .split('\n')
    .map((line) => '> ' + line)
    .join('\n');
  return quoted + '\n\n';
}

/**
 * Process a table — pipe-delimited rows.
 */
function processTable(node: AdfNode): string {
  if (!node.content) return '';
  const rows: string[][] = [];
  let hasHeader = false;

  for (const row of node.content) {
    if (row.type !== 'tableRow') continue;
    const cells: string[] = [];
    for (const cell of row.content ?? []) {
      if (cell.type === 'tableHeader') hasHeader = true;
      cells.push(processInlineContainer(cell).trim());
    }
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  let out = '';
  for (let i = 0; i < rows.length; i++) {
    out += '| ' + rows[i].join(' | ') + ' |\n';
    // Add header separator after the first row if it contained headers.
    if (i === 0 && hasHeader) {
      out += '| ' + rows[i].map(() => '---').join(' | ') + ' |\n';
    }
  }
  return out;
}

/**
 * Process a panel — prefixed with the panel type.
 */
function processPanel(node: AdfNode, ctx: WalkContext): string {
  if (!node.content) return '';
  const panelType = (node.attrs?.panelType ?? 'info').toUpperCase();
  const inner = processNodes(node.content, ctx).trim();
  return `[${panelType}]: ${inner}\n\n`;
}

/**
 * Process an expand / nestedExpand — title followed by content.
 */
function processExpand(node: AdfNode, ctx: WalkContext): string {
  const title = node.attrs?.title ?? '';
  const inner = node.content ? processNodes(node.content, ctx).trim() : '';
  if (title && inner) return `${title}\n${inner}\n\n`;
  if (title) return `${title}\n\n`;
  if (inner) return `${inner}\n\n`;
  return '';
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Extract raw text from a node's children (used for codeBlock etc.
 * where structure is not needed).
 */
function extractText(node: AdfNode): string {
  if (!node.content) return node.text ?? '';
  return node.content.map((child) => extractText(child)).join('');
}

/**
 * Format a Unix-millisecond timestamp to an ISO date string (YYYY-MM-DD).
 */
function formatTimestamp(ts: string | number | undefined): string {
  if (ts === undefined || ts === null) return '';
  const ms = typeof ts === 'string' ? parseInt(ts, 10) : ts;
  if (isNaN(ms)) return '';
  return new Date(ms).toISOString().split('T')[0];
}
