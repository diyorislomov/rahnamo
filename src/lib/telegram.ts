import 'server-only';

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

export async function sendTelegramText(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token.includes('placeholder')) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
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

export async function sendTelegramNotification(payload: NotificationBookingPayload): Promise<boolean> {
  const message = `
🐪 YANGI RAHNAMO QABULI!

🎫 Chipta ID: ${payload.id}
👤 Talaba: ${payload.studentName}
🎓 Rahnamo: ${payload.counselorName}
⏱ Sessiya vaqti: ${payload.slot}
💰 Sessiya turi & To'lov: ${payload.tier.toUpperCase()} (${payload.price.toLocaleString()} UZS via ${payload.paymentMethod.toUpperCase()})

📱 Telefon: ${payload.phone}
💬 Telegram: ${payload.telegram}
✉️ Email: ${payload.email}
🏫 Ta'lim: ${payload.education}

❓ Asosiy savol:
${payload.question}

🔗 Video uchrashuv havolasi:
${payload.meetLink}
  `.trim();
  return sendTelegramText(message);
}
