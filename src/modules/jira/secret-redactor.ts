/**
 * Configurable regex-based secret redaction engine.
 *
 * Scans plain text for known credential patterns and replaces them with
 * typed placeholders: `[REDACTED:type]`. Patterns are applied in array
 * order; the engine avoids double-redacting the same text segment.
 *
 * The default pattern set covers: AWS keys, API tokens, Bearer tokens,
 * passwords in key-value pairs, PEM private keys, connection strings
 * with embedded credentials, and generic high-entropy secrets.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single redaction rule. */
export interface RedactionPattern {
  /** Type label used in the placeholder, e.g. "aws-key". */
  name: string;
  /** Regex that matches the secret. Must NOT use the global flag — the
   *  engine applies `replace` with a fresh regex each time. */
  pattern: RegExp;
  /** Optional custom replacement. Defaults to `[REDACTED:name]`. */
  replace?: (match: string) => string;
}

/** Result returned by `redactSecrets`. */
export interface RedactionResult {
  /** Text with secrets replaced by placeholders. */
  text: string;
  /** Per-type summary of redactions applied. */
  redactions: { type: string; count: number }[];
  /** Total count of individual redactions. */
  totalRedacted: number;
}

// ---------------------------------------------------------------------------
// Default patterns (research.md §4)
// ---------------------------------------------------------------------------

export const DEFAULT_PATTERNS: RedactionPattern[] = [
  // 1. AWS access key IDs — AKIA followed by 16 uppercase alphanumeric chars.
  {
    name: 'aws-key',
    pattern: /AKIA[A-Z0-9]{16}/g,
  },

  // 2. AWS secret access keys — 40-char base64 string after a key-value
  //    separator (common in config files pasted into Jira).
  {
    name: 'aws-secret',
    pattern:
      /(?<=(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY|secret_access_key)\s*[=:]\s*)[A-Za-z0-9/+=]{40}/g,
  },

  // 3. Well-known API token prefixes (OpenAI, GitHub, Slack).
  {
    name: 'api-token',
    pattern:
      /(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36}|xoxb-[a-zA-Z0-9\-]{20,}|xoxp-[a-zA-Z0-9\-]{20,})/g,
  },

  // 4. Bearer tokens in text.
  {
    name: 'bearer-token',
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
  },

  // 5. Key-value password patterns.
  {
    name: 'password',
    pattern:
      /(?:password|passwd|secret|token|api_key|apikey|api-key)\s*[=:]\s*\S+/gi,
  },

  // 6. PEM private key blocks.
  {
    name: 'private-key',
    pattern:
      /-----BEGIN\s(?:RSA\s|EC\s|DSA\s|OPENSSH\s)?PRIVATE\sKEY-----[\s\S]*?-----END\s(?:RSA\s|EC\s|DSA\s|OPENSSH\s)?PRIVATE\sKEY-----/g,
  },

  // 7. Connection strings with embedded credentials (://user:pass@host).
  {
    name: 'connection-string',
    pattern:
      /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s:]+:[^\s@]+@[^\s]+/g,
  },

  // 8. Generic high-entropy strings after key-value separators (catch-all,
  //    applied last to avoid over-matching).
  {
    name: 'generic-high-entropy',
    pattern:
      /(?<=(?:SECRET|KEY|TOKEN|CREDENTIAL|AUTH)[_-]?\w*\s*[=:]\s*)[A-Za-z0-9/+=\-_.]{40,}/gi,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan `text` for secrets and replace them with typed placeholders.
 *
 * @param text     - The plain text to scan.
 * @param patterns - Redaction patterns to apply (defaults to DEFAULT_PATTERNS).
 * @returns A `RedactionResult` with the redacted text and per-type counts.
 */
export function redactSecrets(
  text: string,
  patterns: RedactionPattern[] = DEFAULT_PATTERNS,
): RedactionResult {
  const counts = new Map<string, number>();
  let result = text;

  for (const rule of patterns) {
    // Create a fresh regex with the global flag for replacement.
    const flags = rule.pattern.flags.includes('g')
      ? rule.pattern.flags
      : rule.pattern.flags + 'g';
    const regex = new RegExp(rule.pattern.source, flags);

    let matchCount = 0;
    result = result.replace(regex, (match) => {
      matchCount++;
      if (rule.replace) {
        return rule.replace(match);
      }
      return `[REDACTED:${rule.name}]`;
    });

    if (matchCount > 0) {
      counts.set(rule.name, (counts.get(rule.name) ?? 0) + matchCount);
    }
  }

  const redactions = Array.from(counts.entries()).map(([type, count]) => ({
    type,
    count,
  }));
  const totalRedacted = redactions.reduce((sum, r) => sum + r.count, 0);

  return { text: result, redactions, totalRedacted };
}
