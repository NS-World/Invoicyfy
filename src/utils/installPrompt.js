/**
 * "Install app": Chrome / Edge on Android and desktop fire `beforeinstallprompt` once, often before the screen with
 * the Install button is open, so it is caught here at start-up. iPhone / iPad Safari has no such event — the app is
 * added from the Share menu ("Add to Home Screen").
 */
let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

export const isIos = () =>
  typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export const canPromptInstall = () => Boolean(deferred);

/** Shows the browser's own install dialog. Resolves true when the app was installed. */
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  emit();
  e.prompt();
  const choice = await e.userChoice.catch(() => null);
  return choice?.outcome === "accepted";
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
