"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { icons } from "lucide-react";
import {
  loadTelegramConfig,
  saveTelegramConfig,
  clearTelegramConfig,
} from "@/lib/telegram";

function LIcon({ name, size = 20, stroke = 1.75 }) {
  const Cmp = icons[name] || icons.Circle;
  return <Cmp size={size} strokeWidth={stroke} aria-hidden />;
}

export default function TelegramSetup({ onConfigured, onSkip }) {
  const [chatId, setChatId] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const existing = useRef(null);

  useEffect(() => {
    existing.current = loadTelegramConfig();
    if (existing.current) {
      setChatId(existing.current.chatId);
    }
  }, []);

  const handleSave = useCallback(
    async (e) => {
      e?.preventDefault();
      setError("");
      if (!chatId.trim()) {
        setError("Enter your chat ID.");
        return;
      }

      setTesting(true);
      try {
        const res = await fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: chatId.trim(),
            text: "Aloud is connected — messages from the user will appear here.",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Connection failed. Check your chat ID.");
          setTesting(false);
          return;
        }
        saveTelegramConfig(chatId.trim());
        onConfigured?.();
      } catch {
        setError("Network error — could not reach Telegram.");
        setTesting(false);
        return;
      }
      setTesting(false);
    },
    [chatId, onConfigured]
  );

  const handleClear = useCallback(() => {
    clearTelegramConfig();
    setChatId("");
    existing.current = null;
  }, []);

  return (
    <div className="overlay" onClick={onSkip}>
      <div className="sheet tg-setup" onClick={(e) => e.stopPropagation()}>
        <h2>
          <span className="tg-ico">🤖</span> Connect Telegram
        </h2>
        <p>
          Every message the user speaks will be sent to you on Telegram.
          You only need to set this up once.
        </p>

        <form onSubmit={handleSave} className="tg-form">
          <label className="tg-label">
            <span className="tg-lbl">Your Chat ID</span>
            <span className="tg-hint">
              Message{" "}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
              >
                @userinfobot
              </a>{" "}
              on Telegram — it will reply with your numeric chat ID. Paste it below.
            </span>
            <input
              type="text"
              className="tg-input"
              placeholder="e.g. 123456789"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          {error && <p className="tg-error">{error}</p>}

          <div className="tg-actions">
            <button
              type="submit"
              className="tg-save"
              disabled={testing}
            >
              {testing ? "Testing…" : "Save & Test"}
            </button>
            {existing.current && (
              <button
                type="button"
                className="tg-clear"
                onClick={handleClear}
              >
                Disconnect
              </button>
            )}
            <button
              type="button"
              className="tg-skip"
              onClick={onSkip}
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
