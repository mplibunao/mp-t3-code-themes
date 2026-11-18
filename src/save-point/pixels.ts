// Helpers for pixel maps (one string per row, one character per pixel) and the seeded random
// numbers that place stars, peaks, and pines.

const missing = (index: number): never => {
  throw new RangeError(`Nothing at index ${index}`);
};

// The item at `index`. A missing item means the artwork or a drawing step is wrong.
export const at = <T>(items: ArrayLike<T>, index: number): T => items[index] ?? missing(index);

/* oxlint-disable no-bitwise -- A seeded PRNG is bit arithmetic by definition, and a rewrite would risk the byte-identical output. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* oxlint-enable no-bitwise */

export function grid(w: number, h: number): string[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
}

export const setCell = (cells: string[][], x: number, y: number, value: string): void => {
  at(cells, y)[x] = value;
};

export const rowsOf = (cells: string[][]): string[] => cells.map((row) => row.join(""));

export const mirror = (rows: readonly string[]): string[] =>
  rows.map((row) => {
    const cells = [...row];
    cells.reverse();
    return cells.join("");
  });

export const blank = (w: number, count: number): string[] =>
  Array.from({ length: count }, () => ".".repeat(w));
