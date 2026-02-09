import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';
import { ConfigService } from '@nestjs/config';

export class JiraClient {
  private readonly client: AxiosInstance;
  private readonly limiter: Bottleneck;

  constructor(private readonly config: ConfigService) {
    const email = config.get<string>('JIRA_EMAIL');
    const token = config.get<string>('JIRA_API_TOKEN');
    const basicAuth = Buffer.from(`${email}:${token}`).toString('base64');

    this.client = axios.create({
      baseURL: config.get<string>('JIRA_BASE_URL'),
      timeout: Number(config.get('JIRA_TIMEOUT_MS') || 10000),
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
    });

    this.limiter = new Bottleneck({
      maxConcurrent: Number(config.get('JIRA_MAX_CONCURRENT') || 5),
      minTime: Number(config.get('JIRA_MIN_TIME_MS') || 100),
    });
  }

  async fetchIssue(key: string) {
    const retries = Number(this.config.get('JIRA_RETRY_COUNT') || 1);
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await this.limiter.schedule(() =>
          this.client.get(`/rest/api/3/issue/${key}`),
        );
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}
