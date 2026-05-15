/** Remember last owner URL for “resume where I left off” when reopening the installed PWA. */

export const LAST_OWNER_PATH_KEY = "pwa:last-owner-path:v1";

/** sessionStorage: only auto-resume once per browser session so owners can still open the public home on purpose later. */
export const OWNER_RESUME_SESSION_KEY = "pwa:owner-resume:auto-done";

/**
 * @param {string | null | undefined} pathname
 */
export function rememberLastOwnerPath(pathname) {
  if (!pathname || typeof pathname !== "string") return;
  if (!pathname.startsWith("/owner")) return;
  try {
    localStorage.setItem(LAST_OWNER_PATH_KEY, pathname);
  } catch {
    /* ignore */
  }
}

/** @returns {string | null} */
export function getLastOwnerPath() {
  try {
    const p = localStorage.getItem(LAST_OWNER_PATH_KEY);
    if (p && p.startsWith("/owner")) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function isLikelyInstalledPwa() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  // iOS Safari “Add to Home Screen”
  if (typeof navigator !== "undefined" && "standalone" in navigator && navigator.standalone === true) return true;
  return false;
}
