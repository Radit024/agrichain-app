export function computeSeed(batchId: string, scenario: string, runIndex: number): number {
  let h = 0xdeadbeef;
  const str = `${batchId}:${scenario}:${runIndex}`;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

export function seededFloat(seed: number, min: number, max: number): number {
  // Simple LCG
  const m = 0x80000000;
  const a = 1103515245;
  const c = 12345;
  const nextSeed = (a * seed + c) % m;
  const fraction = nextSeed / (m - 1);
  return min + fraction * (max - min);
}
