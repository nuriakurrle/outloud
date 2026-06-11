export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 7) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
