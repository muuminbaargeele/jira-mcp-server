const JIRA_KEY_REGEX = /^[A-Z][A-Z0-9]+-\d+$/;

export function isValidJiraKey(key: string): boolean {
  return JIRA_KEY_REGEX.test(key);
}
