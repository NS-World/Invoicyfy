import gu from "./gu";
import hi from "./hi";

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "gu", label: "ગુજરાતી", short: "ગુ" },
  { code: "hi", label: "हिन्दी", short: "हि" },
];

const DICTS = { gu, hi };

/** Texts are keyed by their English wording; missing ones stay English. {name} style placeholders are filled from vars. */
export const translate = (lang, text, vars) => {
  if (text === null || text === undefined || typeof text !== "string") return text;
  let out = (lang !== "en" && DICTS[lang]?.[text]) || text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return out;
};
