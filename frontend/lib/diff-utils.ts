export type Diff = {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
};

export const computeLineDiff = (baseline: string, target: string): Diff[] => {
  const oldLines = baseline.split(/\r?\n/);
  const newLines = target.split(/\r?\n/);
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: Diff[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: 'unchanged', value: oldLines[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'removed', value: oldLines[i] });
      i += 1;
    } else {
      result.push({ type: 'added', value: newLines[j] });
      j += 1;
    }
  }

  while (i < m) {
    result.push({ type: 'removed', value: oldLines[i] });
    i += 1;
  }

  while (j < n) {
    result.push({ type: 'added', value: newLines[j] });
    j += 1;
  }

  return result;
};
