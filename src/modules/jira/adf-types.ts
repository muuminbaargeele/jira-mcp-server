/**
 * Atlassian Document Format (ADF) TypeScript type definitions.
 *
 * ADF is a JSON format used by Jira Cloud to represent rich text in issue
 * descriptions, comments, and custom fields. These interfaces model the
 * subset of the ADF specification relevant to Jira issue descriptions.
 *
 * Reference: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure
 */

/** Root ADF document node — every ADF document starts with this. */
export interface AdfDocument {
  version: 1;
  type: 'doc';
  content: AdfNode[];
}

/**
 * Any node in the ADF tree.
 *
 * Block nodes (paragraph, heading, bulletList, etc.) have `content` arrays.
 * Inline nodes (text, mention, emoji, etc.) carry data in `text` or `attrs`.
 * Text nodes may also have `marks` for formatting.
 */
export interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  marks?: AdfMark[];
  attrs?: Record<string, any>;
}

/**
 * Formatting mark on a text node.
 *
 * Marks represent inline formatting such as bold, italic, links, etc.
 * The normalization pipeline strips all marks and preserves only the
 * underlying text content.
 */
export interface AdfMark {
  type: string;
  attrs?: Record<string, any>;
}
