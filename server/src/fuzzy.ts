import { MockRoute } from './types';

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Finds closest mock routes matching reqPath with Levenshtein distance <= maxDistance,
 * sorted by ascending distance.
 */
export function findFuzzyHints(
  reqMethod: string,
  reqPath: string,
  mocks: MockRoute[],
  maxDistance: number = 4,
  maxLimit: number = 3
): string[] {
  const candidates = mocks.map((mock) => {
    const distance = levenshteinDistance(reqPath, mock.path);
    return {
      label: `${mock.method} ${mock.path}`,
      distance,
    };
  });

  // Filter paths where distance <= 4, sort ascending, take top closest
  const filtered = candidates
    .filter((item) => item.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  // Deduplicate entries while preserving order
  const unique = Array.from(new Set(filtered.map((item) => item.label)));
  return unique.slice(0, maxLimit);
}

/**
 * Normalizes route path by removing trailing slash (unless root).
 */
export function normalizePath(p: string): string {
  if (!p || p === '/') return '/';
  const stripped = p.replace(/\/+$/, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

/**
 * Matches a mock route pattern (with :param and * wildcard support) against an actual request path.
 */
export function matchRoutePattern(
  pattern: string,
  actualPath: string
): { matches: boolean; params: Record<string, string> } {
  const normPattern = normalizePath(pattern);
  const normPath = normalizePath(actualPath);

  // Fast path: exact match
  if (normPattern === normPath) {
    return { matches: true, params: {} };
  }

  // If pattern has no dynamic parts (: or *), not a match
  if (!normPattern.includes(':') && !normPattern.includes('*')) {
    return { matches: false, params: {} };
  }

  const paramNames: string[] = [];
  const segments = normPattern.split('/');
  const regexSegments = segments.map((seg) => {
    if (seg.startsWith(':')) {
      paramNames.push(seg.slice(1));
      return '([^/]+)';
    }
    if (seg === '*') {
      paramNames.push('*');
      return '(.*)';
    }
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  const regex = new RegExp(`^${regexSegments.join('/')}$`);
  const match = normPath.match(regex);
  if (!match) {
    return { matches: false, params: {} };
  }

  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1] || '';
  });

  return { matches: true, params };
}
