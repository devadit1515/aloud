const CONFIG_KEY = "aloud.telegram.v1";

export function loadTelegramConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (cfg && cfg.chatId) return cfg;
  } catch {}
  return null;
}

export function saveTelegramConfig(chatId) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ chatId }));
  } catch {}
}

export function clearTelegramConfig() {
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {}
}

export async function sendToTelegram(text, cfg) {
  if (!cfg || !cfg.chatId || !text?.trim()) return null;
  try {
    const res = await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: cfg.chatId, text }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "send failed" };
    return { ok: true };
  } catch (err) {
    return { error: err.message || "network error" };
  }
}
