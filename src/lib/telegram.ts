import 'server-only';

export interface NotificationBookingPayload {
  id: string;
  studentName: string;
  counselorName: string;
  tier: string;
  price: number;
  slot: string;
  paymentMethod: string;
  phone?: string | null;
  telegram: string;
  email: string;
  education?: string | null;
  educationStage?: string | null;
  isUnder18?: boolean;
  question: string;
  meetLink: string;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return 'Ko‘rsatilmagan (Ma’lumot minimallashtirilgan)';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 7) return '***';
  return `${cleaned.slice(0, 4)} *** ** ${cleaned.slice(-2)}`;
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
  const under18Badge = payload.isUnder18 ? '⚠️ 18 yoshdan kichik (Ota-ona roziligi olingan)\n' : '';
  const message = `
🐪 YANGI RAHNAMO QABULI!

🎫 Chipta ID: ${payload.id}
👤 Murojaatchi: ${payload.studentName}
${under18Badge}🎓 Rahnamo: ${payload.counselorName}
⏱ Sessiya vaqti: ${payload.slot}
💰 Sessiya turi & To'lov: ${payload.tier.toUpperCase()} (${payload.price.toLocaleString()} UZS via ${payload.paymentMethod.toUpperCase()})

📱 Telefon (himoyalangan): ${maskPhone(payload.phone)}
💬 Telegram: @${payload.telegram.replace(/^@/, '')}
✉️ Email (niqoblangan): ${maskEmail(payload.email)}
🏫 Ta'lim / Bosqich: ${payload.educationStage || payload.education || 'Ko‘rsatilmagan'}

❓ Murojaat mazmuni:
${payload.question}

🔗 Video uchrashuv xonasi:
${payload.meetLink}
  `.trim();
  return sendTelegramText(message);
}
