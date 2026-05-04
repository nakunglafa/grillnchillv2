"use client";

import { useEffect, useMemo, useState } from "react";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Francais" },
  { code: "pt", label: "Portugues" },
  { code: "de", label: "Deutsch" },
];

const GOOGLE_SCRIPT_ID = "google-translate-script";
const SITE_LANGUAGE_KEY = "site-language";
const SITE_LANGUAGE_COOKIE = "site_language";
const DEFAULT_LANGUAGE = "en";

function isSupportedLanguage(lang) {
  return SUPPORTED_LANGUAGES.some((entry) => entry.code === lang);
}

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`;
}

function getCookie(name) {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
  );
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function getLanguageFromCookie() {
  if (typeof document === "undefined") return DEFAULT_LANGUAGE;
  const value = getCookie("googtrans").trim();
  if (!value) return DEFAULT_LANGUAGE;
  const parts = value.split("/");
  const lang = parts[parts.length - 1] || DEFAULT_LANGUAGE;
  return isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
}

function setGoogleTranslateCookie(lang) {
  const safeLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  const cookieValue = `/en/${safeLang}`;
  setCookie("googtrans", cookieValue);
}

function getStoredLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const fromAppCookie = getCookie(SITE_LANGUAGE_COOKIE);
  if (isSupportedLanguage(fromAppCookie)) return fromAppCookie;
  const fromStorage = window.localStorage.getItem(SITE_LANGUAGE_KEY) || "";
  if (isSupportedLanguage(fromStorage)) return fromStorage;
  return getLanguageFromCookie();
}

function persistSelectedLanguage(lang) {
  const safeLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  setCookie(SITE_LANGUAGE_COOKIE, safeLang);
  setGoogleTranslateCookie(safeLang);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SITE_LANGUAGE_KEY, safeLang);
  }
}

export default function LanguageSwitcher() {
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);

  const includedLanguages = useMemo(
    () => SUPPORTED_LANGUAGES.map((entry) => entry.code).join(","),
    []
  );

  useEffect(() => {
    const preferredLanguage = getStoredLanguage();
    setSelectedLanguage(preferredLanguage);
    persistSelectedLanguage(preferredLanguage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google?.translate) return;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate) return;
      // Hidden widget instance needed for Google translate runtime.
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: false,
          includedLanguages,
        },
        "google_translate_element"
      );
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, [includedLanguages]);

  const handleChange = (event) => {
    const lang = event.target.value;
    setSelectedLanguage(lang);
    persistSelectedLanguage(lang);
    window.location.reload();
  };

  return (
    <>
      <div id="google_translate_element" className="hidden" aria-hidden />
      <div className="language-switcher">
        <select
          id="site-language"
          value={selectedLanguage}
          onChange={handleChange}
          className="language-switcher__select"
          aria-label="Select language"
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
