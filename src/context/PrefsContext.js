import { createContext, useCallback, useContext } from "react";
import { translate } from "../i18n";

export const PrefsContext = createContext({ lang: "en", mode: "light", setLang: () => {}, setMode: () => {} });

export const usePrefs = () => useContext(PrefsContext);

/** const t = useT(); t("Quick Bill") -> "ઝડપી બિલ" (falls back to English when a text is not translated) */
export const useT = () => {
  const { lang } = useContext(PrefsContext);
  return useCallback((text, vars) => translate(lang, text, vars), [lang]);
};
