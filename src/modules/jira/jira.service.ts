import { Injectable } from '@nestjs/common';
import { JiraClient } from './jira.client';
import { AuditService } from '../audit/audit.service';
import { AppError, ErrorCode } from '../../common/errors';
import { hashNormalizedIssue, normalizeIssue } from './normalize';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JiraService {
  private readonly client: JiraClient;

  constructor(
    config: ConfigService,
    private readonly audit: AuditService,
  ) {
    this.client = new JiraClient(config);
  }

  async getNormalizedIssue(key: string, clientId: string, requestId: string) {
    const start = Date.now();
    try {
      const response = await this.client.fetchIssue(key);
      const normalized = normalizeIssue(response.data);
      const payloadHash = hashNormalizedIssue(normalized);
      this.audit.recordInteraction({
        jiraKey: key,
        requestId,
        clientId,
        outcome: 'success',
        httpStatus: response.status,
        latencyMs: Date.now() - start,
        responseSummary: JSON.stringify({ key, status: normalized.status }),
        payloadHash,
      });
      return normalized;
    } catch (error: any) {
      const status = error?.response?.status;
      const code =
        status === 400
          ? ErrorCode.INVALID_KEY
          : status === 403
            ? ErrorCode.ACCESS_DENIED
            : status === 404
              ? ErrorCode.NOT_FOUND
              : status === 504
                ? ErrorCode.JIRA_TIMEOUT
                : ErrorCode.JIRA_ERROR;

      const message =
        code === ErrorCode.INVALID_KEY
          ? 'Invalid Jira key format'
          : code === ErrorCode.ACCESS_DENIED
            ? 'Access denied to Jira issue'
            : code === ErrorCode.NOT_FOUND
              ? 'Jira issue not found'
              : code === ErrorCode.JIRA_TIMEOUT
                ? 'Jira request timed out'
                : 'Jira request failed';

      this.audit.recordInteraction({
        jiraKey: key,
        requestId,
        clientId,
        outcome: status === 504 ? 'timeout' : 'error',
        httpStatus: status,
        latencyMs: Date.now() - start,
        responseSummary: JSON.stringify({ key, error: code }),
        errorCode: code,
        errorMessage: message,
        payloadHash: 'error',
      });

      throw new AppError(code, message);
    }
  }
}
