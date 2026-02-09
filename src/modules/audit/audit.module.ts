import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JiraInteractionLogEntity } from './jira-interaction.entity';
import { AuditService } from './audit.service';
import { AuditRetentionService } from './audit.retention';

@Module({
  imports: [TypeOrmModule.forFeature([JiraInteractionLogEntity])],
  providers: [AuditService, AuditRetentionService],
  exports: [AuditService],
})
export class AuditModule {}
