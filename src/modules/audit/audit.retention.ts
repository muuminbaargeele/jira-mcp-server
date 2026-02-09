import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JiraInteractionLogEntity } from './jira-interaction.entity';
import { ConfigService } from '@nestjs/config';
import { getLogger } from '../../common/logger';

@Injectable()
export class AuditRetentionService implements OnModuleInit {
  private readonly logger = getLogger();

  constructor(
    @InjectRepository(JiraInteractionLogEntity)
    private readonly repo: Repository<JiraInteractionLogEntity>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const intervalMinutes = Number(this.config.get('AUDIT_RETENTION_INTERVAL_MINUTES') || 60);
    setInterval(() => this.purgeOldRecords(), intervalMinutes * 60 * 1000);
  }

  async purgeOldRecords() {
    const retentionDays = Number(this.config.get('AUDIT_RETENTION_DAYS') || 90);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.repo.delete({ timestamp: LessThan(cutoff) });
    this.logger.info(
      { deleted: result.affected ?? 0, cutoff: cutoff.toISOString() },
      'Audit retention purge complete',
    );
  }
}
