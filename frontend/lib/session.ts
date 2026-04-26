"use client";

const KEY = "wake_session";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr-stub";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(KEY, id);
    // Mirror to a cookie so server actions can pick it up.
    document.cookie = `${KEY}=${id}; path=/; SameSite=Lax; Max-Age=31536000`;
  }
  return id;
}
