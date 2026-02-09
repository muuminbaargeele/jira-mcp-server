import { IsString, Matches } from 'class-validator';

export class JiraIssueRequestDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9]+-\d+$/)
  key!: string;
}

export class ErrorResponseDto {
  code!: string;
  message!: string;
}

export class NormalizedIssueResponseDto {
  key!: string;
  summary!: string;
  status!: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  attachments!: { name: string; size: number; mimeType: string; url?: string }[];
  metadata!: { deterministic: boolean; sourceUpdatedAt?: string };
}
