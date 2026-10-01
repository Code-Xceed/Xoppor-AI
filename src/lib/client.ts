/**
 * Browser-side helper: attach the dashboard access key (CRON_SECRET) to API
 * calls when one is configured. The key is entered once on the Settings page
 * and stored in localStorage only — never sent anywhere except this app's API.
 */

const KEY_STORAGE = "xoppor_access_key";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_STORAGE) ?? "";
}

export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) window.localStorage.setItem(KEY_STORAGE, trimmed);
  else window.localStorage.removeItem(KEY_STORAGE);
}

/** Append ?key=… to an API path when a key is stored. */
export function withKey(path: string): string {
  const key = getApiKey();
  if (!key) return path;
  return `${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
}
