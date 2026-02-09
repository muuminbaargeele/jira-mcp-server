import { Body, Controller, HttpException, Post, Req, UseGuards } from '@nestjs/common';
import { JiraService } from '../jira/jira.service';
import { JiraIssueRequestDto, NormalizedIssueResponseDto } from './mcp.dto';
import { McpAuthGuard } from './mcp.auth.guard';
import { AppError, ErrorCode, toErrorResponse } from '../../common/errors';
import crypto from 'crypto';

@Controller('/mcp/jira')
export class McpController {
  constructor(private readonly jiraService: JiraService) {}

  @UseGuards(McpAuthGuard)
  @Post('/issue')
  async getIssue(
    @Body() body: JiraIssueRequestDto,
    @Req() request: { clientId?: string },
  ): Promise<NormalizedIssueResponseDto> {
    const requestId = crypto.randomUUID();
    try {
      return await this.jiraService.getNormalizedIssue(
        body.key,
        request.clientId || 'unknown-client',
        requestId,
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw new HttpException(toErrorResponse(error), this.mapError(error.code));
      }
      throw error;
    }
  }

  private mapError(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.INVALID_KEY:
        return 400;
      case ErrorCode.ACCESS_DENIED:
        return 403;
      case ErrorCode.NOT_FOUND:
        return 404;
      case ErrorCode.JIRA_TIMEOUT:
        return 504;
      case ErrorCode.UNAUTHORIZED:
        return 401;
      default:
        return 502;
    }
  }
}
