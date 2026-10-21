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
