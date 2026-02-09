import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'jira_interaction_logs' })
export class JiraInteractionLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'datetime' })
  timestamp!: Date;

  @Column({ type: 'varchar', length: 64 })
  jiraKey!: string;

  @Column({ type: 'varchar', length: 64 })
  requestId!: string;

  @Column({ type: 'varchar', length: 128 })
  clientId!: string;

  @Column({ type: 'varchar', length: 16 })
  outcome!: string;

  @Column({ type: 'int', nullable: true })
  httpStatus?: number;

  @Column({ type: 'int' })
  latencyMs!: number;

  @Column({ type: 'text' })
  responseSummary!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  errorCode?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 128 })
  payloadHash!: string;
}
