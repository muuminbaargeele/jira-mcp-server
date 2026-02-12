import crypto from 'crypto';
import { parseAdf } from './adf-parser';
import { redactSecrets } from './secret-redactor';
import { getLogger } from '../../common/logger';

export interface NormalizedAttachment {
  name: string;
  size: number;
  mimeType: string;
  url?: string;
}

export interface NormalizedIssue {
  key: string;
  summary: string;
  status: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  descriptionText: string;
  descriptionRaw: object | null;
  createdAt?: string;
  updatedAt?: string;
  attachments: NormalizedAttachment[];
  metadata: {
    deterministic: boolean;
    sourceUpdatedAt?: string;
  };
}

/**
 * Safely parse an ADF document and redact secrets. On error, returns ""
 * and logs the failure without crashing the issue retrieval (NFR-002).
 *
 * Pipeline: ADF → plain text → redact secrets → final text.
 * If secrets are found, a structured audit event is emitted (FR-011).
 */
function safeNormalizeDescription(description: any, issueKey: string): string {
  const logger = getLogger();
  try {
    logger.debug({ issueKey }, 'description_normalize_start');

    // Step 1: Parse ADF to plain text.
    const plainText = parseAdf(description);
    if (!plainText) {
      logger.debug({ issueKey }, 'description_normalize_empty');
      return '';
    }

    // Step 2: Redact secrets from the plain text.
    const result = redactSecrets(plainText);

    // Step 3: Log redaction audit event if any secrets were found (FR-011).
    if (result.totalRedacted > 0) {
      logger.warn(
        {
          issueKey,
          redactions: result.redactions,
          totalRedacted: result.totalRedacted,
        },
        'secrets_redacted',
      );
    }

    logger.debug(
      { issueKey, textLength: result.text.length },
      'description_normalize_complete',
    );
    return result.text;
  } catch (err: any) {
    logger.error(
      { issueKey, error: err?.message ?? String(err) },
      'adf_parse_failed',
    );
    return '';
  }
}

export function normalizeIssue(issue: any): NormalizedIssue {
  const fields = issue?.fields || {};
  const attachments = (fields.attachment || []).map((att: any) => ({
    name: att.filename,
    size: att.size,
    mimeType: att.mimeType,
    url: att.content,
  }));

  return {
    key: issue.key,
    summary: fields.summary,
    status: fields.status?.name,
    issueType: fields.issuetype?.name,
    priority: fields.priority?.name,
    assignee: fields.assignee?.displayName,
    reporter: fields.reporter?.displayName,
    descriptionText: safeNormalizeDescription(fields.description, issue.key),
    descriptionRaw: fields.description ?? null,
    createdAt: fields.created,
    updatedAt: fields.updated,
    attachments,
    metadata: {
      deterministic: true,
      sourceUpdatedAt: fields.updated,
    },
  };
}

export function hashNormalizedIssue(normalized: NormalizedIssue): string {
  const payload = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(payload).digest('hex');
}
