import crypto from 'crypto';

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
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  attachments: NormalizedAttachment[];
  metadata: {
    deterministic: boolean;
    sourceUpdatedAt?: string;
  };
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
    description: fields.description?.content ? JSON.stringify(fields.description) : undefined,
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
