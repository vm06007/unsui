export const number = (n: number, d = 4) =>
    n.toLocaleString('en-US', { maximumFractionDigits: d });
