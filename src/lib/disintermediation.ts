/**
 * Anti-disintermediation and PII masking helper for messaging and Q&A threads.
 * Prevents moving off-platform to circumvent platform escrow, guarantees, and child safety rules.
 */

// Regex patterns for detecting off-platform communication attempts
const PHONE_PATTERN = /(\+?998[\s.-]?)?(\(?\d{2}\)?[\s.-]?)?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}|\b\d{7,12}\b/g;
const TELEGRAM_HANDLE_PATTERN = /(?:^|\s)@([a-zA-Z0-9_]{4,32})\b/g;
const EXTERNAL_LINK_PATTERN = /(https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;
const TELEGRAM_LINK_PATTERN = /(t\.me|telegram\.me|tg:\/\/)[^\s]*/gi;

export interface DisintermediationCheckResult {
  hasOffPlatformContacts: boolean;
  reasons: ('phone' | 'telegram' | 'link')[];
  warningMessageUz?: string;
}

export function detectOffPlatformContacts(text: string): DisintermediationCheckResult {
  const reasons: ('phone' | 'telegram' | 'link')[] = [];

  if (PHONE_PATTERN.test(text)) {
    reasons.push('phone');
  }
  if (TELEGRAM_HANDLE_PATTERN.test(text) || TELEGRAM_LINK_PATTERN.test(text)) {
    reasons.push('telegram');
  }
  if (EXTERNAL_LINK_PATTERN.test(text)) {
    reasons.push('link');
  }

  const hasOffPlatformContacts = reasons.length > 0;
  let warningMessageUz: string | undefined;

  if (hasOffPlatformContacts) {
    warningMessageUz =
      "Xavfsizlik va kafolat qoidalariga muvofiq, chat orqali shaxsiy telefon raqamlari, tashqi havolalar yoki Telegram kontaktlarini almashish cheklangan. Barcha suhbatlar platforma ichida olib borilishi lozim.";
  }

  return {
    hasOffPlatformContacts,
    reasons,
    warningMessageUz,
  };
}

/**
 * Mask off-platform contacts in text to prevent disintermediation while preserving the message flow.
 */
export function maskOffPlatformContacts(text: string): string {
  let cleaned = text;

  // Mask links first
  cleaned = cleaned.replace(EXTERNAL_LINK_PATTERN, '[havola himoyalangan]');
  cleaned = cleaned.replace(TELEGRAM_LINK_PATTERN, '[telegram havola himoyalangan]');

  // Mask phones
  cleaned = cleaned.replace(PHONE_PATTERN, '[telefon himoyalangan]');

  // Mask direct @handles in Q&A
  cleaned = cleaned.replace(TELEGRAM_HANDLE_PATTERN, ' [@kontakt himoyalangan]');

  return cleaned;
}
