import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JiraInteractionLogEntity } from './jira-interaction.entity';
import { getLogger } from '../../common/logger';

export interface AuditRecordInput {
  jiraKey: string;
  requestId: string;
  clientId: string;
  outcome: 'success' | 'error' | 'timeout';
  httpStatus?: number;
  latencyMs: number;
  responseSummary: string;
  errorCode?: string;
  errorMessage?: string;
  payloadHash: string;
}

@Injectable()
export class AuditService {
  private readonly logger = getLogger();

  constructor(
    @InjectRepository(JiraInteractionLogEntity)
    private readonly repo: Repository<JiraInteractionLogEntity>,
  ) {}

  recordInteraction(input: AuditRecordInput) {
    const entity: JiraInteractionLogEntity = {
      id: undefined as never,
      timestamp: new Date(),
      ...input,
    };
    void this.repo.save(entity).catch((error) => {
      this.logger.error({ error }, 'Failed to persist audit record');
    });
  }
}
