export enum ErrorCode {
  INVALID_KEY = 'INVALID_KEY',
  NOT_FOUND = 'NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  JIRA_TIMEOUT = 'JIRA_TIMEOUT',
  JIRA_ERROR = 'JIRA_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

export class AppError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
  }
}

export function toErrorResponse(error: AppError) {
  return { code: error.code, message: error.message };
}
