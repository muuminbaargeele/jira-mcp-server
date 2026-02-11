import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJiraInteractionLogs1739345470000 implements MigrationInterface {
  name = 'CreateJiraInteractionLogs1739345470000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS jira_interaction_logs (
        id CHAR(36) PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        jiraKey VARCHAR(64) NOT NULL,
        requestId VARCHAR(64) NOT NULL,
        clientId VARCHAR(128) NOT NULL,
        outcome VARCHAR(16) NOT NULL,
        httpStatus INT NULL,
        latencyMs INT NOT NULL,
        responseSummary TEXT NOT NULL,
        errorCode VARCHAR(64) NULL,
        errorMessage TEXT NULL,
        payloadHash VARCHAR(128) NOT NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS jira_interaction_logs`);
  }
}
