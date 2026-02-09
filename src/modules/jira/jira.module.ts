import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { JiraService } from './jira.service';

@Module({
  imports: [ConfigModule, AuditModule],
  providers: [JiraService],
  exports: [JiraService],
})
export class JiraModule {}
