import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { JiraModule } from '../jira/jira.module';
import { McpAuthGuard } from './mcp.auth.guard';

@Module({
  imports: [JiraModule],
  controllers: [McpController],
  providers: [McpAuthGuard],
})
export class McpModule {}
