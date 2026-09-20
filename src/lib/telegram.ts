export interface NotificationBookingPayload {
  id: string;
  studentName: string;
  counselorName: string;
  tier: string;
  price: number;
  slot: string;
  paymentMethod: string;
  phone: string;
  telegram: string;
  email: string;
  education: string;
  question: string;
  meetLink: string;
}

export async function sendTelegramNotification(payload: NotificationBookingPayload): Promise<boolean> {
  const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

  if (!token || !chatId || token.includes('placeholder')) {
    console.log('[Telegram Notification Logged]:', payload);
    return false;
  }

  const message = `
🐪 *YANGI RAHNAMO QABULI!*

🎫 *Chipta ID:* \`${payload.id}\`
👤 *Talaba:* ${payload.studentName}
🎓 *Rahnamo:* ${payload.counselorName}
⏱ *Sessiya vaqti:* ${payload.slot}
💰 *Sessiya turi & To'lov:* ${payload.tier.toUpperCase()} (${payload.price.toLocaleString()} UZS via ${payload.paymentMethod.toUpperCase()})

📱 *Telefon:* \`${payload.phone}\`
💬 *Telegram:* ${payload.telegram}
✉️ *Email:* ${payload.email}
🏫 *Ta'lim:* ${payload.education}

❓ *Asosiy savol:*
"${payload.question}"

🔗 *Video uchrashuv havolasi:*
${payload.meetLink}
  `.trim();

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    // A non-2xx here doesn't throw -- fetch only rejects on network failure
    // -- so without this, a real API rejection (bad chat id, a message that
    // breaks Telegram's Markdown parser, etc.) would resolve as an unlogged
    // `false` that every call site used to silently ignore.
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[TELEGRAM_API_REJECTED]', res.status, body);
    }
    return res.ok;
  } catch (err) {
    console.error('[TELEGRAM_NETWORK_ERROR]', err);
    return false;
  }
}
