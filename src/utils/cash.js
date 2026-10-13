export const NOTES = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
export const denomTotal = (counts) => NOTES.reduce((s, n) => s + n * (Number(counts?.[n]) || 0), 0);
