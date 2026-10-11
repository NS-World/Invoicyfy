export const monthLabel = (m) => {
  const [y, mo] = String(m).split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

/** On-screen report columns ({ key, label, money, format, type }) -> export columns for Excel / Word. */
export const toExportCols = (cols) =>
  cols.map((c) => {
    const type = c.type || (c.money ? "money" : undefined);
    return { label: c.label, key: c.key, type, total: c.total, value: !type && c.format ? (r) => c.format(r[c.key]) : undefined };
  });

/** "Scoopie'z Icecream" · 01 Apr 2026 – 31 Mar 2027 */
export const rangeText = (range, fmt) => (range?.from ? `${fmt(range.from)} – ${fmt(range.to)}` : "");

export const WEEKDAYS = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
