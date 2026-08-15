import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";
import ne from "@/messages/ne.json";
import fr from "@/messages/fr.json";
import de from "@/messages/de.json";
import nl from "@/messages/nl.json";
import es from "@/messages/es.json";

const MAP = { en, pt, ne, fr, de, nl, es };

export function getMessages(locale) {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return MAP[loc] || en;
}

/**
 * @param {Record<string, unknown>} messages
 * @param {string} path
 * @param {string | Record<string, string | number>} [fallbackOrVars]
 * @param {Record<string, string | number>} [vars]
 */
export function t(messages, path, fallbackOrVars = "", vars) {
  const parts = String(path).split(".");
  let cur = messages;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") {
      cur = undefined;
      break;
    }
    cur = cur[p];
  }

  let fallback = "";
  let replacements = {};
  if (typeof fallbackOrVars === "object" && fallbackOrVars !== null) {
    replacements = fallbackOrVars;
  } else {
    fallback = typeof fallbackOrVars === "string" ? fallbackOrVars : "";
    if (vars && typeof vars === "object") replacements = vars;
  }

  let str = typeof cur === "string" ? cur : fallback || path;
  if (replacements && typeof replacements === "object") {
    str = str.replace(/\{(\w+)\}/g, (_, key) =>
      replacements[key] != null ? String(replacements[key]) : `{${key}}`
    );
  }
  return str;
}
