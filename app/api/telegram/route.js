export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { chatId, text } = body || {};
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return Response.json({ error: "Telegram bot not configured on this server" }, { status: 500 });
  }

  if (!chatId || !text?.trim()) {
    return Response.json({ error: "missing chatId or text" }, { status: 400 });
  }

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.trim(),
          parse_mode: "HTML",
        }),
      }
    );

    const data = await tgRes.json();

    if (!data.ok) {
      const desc = data.description || "Telegram API error";
      return Response.json({ error: desc }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message || "network error" }, { status: 502 });
  }
}
