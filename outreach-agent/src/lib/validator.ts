const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Common emails to skip (generic/no-reply)
const SKIP_EMAILS = new Set([
  "noreply@",
  "no-reply@",
  "donotreply@",
  "unsubscribe@",
  "bounce@",
  "mailer@",
  "spam@",
  "postmaster@",
  "webmaster@",
]);

export function isValidEmail(email: string): boolean {
  if (!EMAIL_REGEX.test(email)) return false;
  const lower = email.toLowerCase();
  return !Array.from(SKIP_EMAILS).some((skip) => lower.startsWith(skip));
}

export function extractEmailsFromText(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  return [...new Set(matches)].filter(isValidEmail);
}

// Prefer business-like emails: info@, hello@, kontakt@, etc.
export function rankEmails(emails: string[]): string[] {
  const preferred = ["info@", "hello@", "kontakt@", "contact@", "admin@", "office@", "rezervacije@", "booking@"];
  return [...emails].sort((a, b) => {
    const aScore = preferred.findIndex((p) => a.toLowerCase().startsWith(p));
    const bScore = preferred.findIndex((p) => b.toLowerCase().startsWith(p));
    if (aScore !== -1 && bScore === -1) return -1;
    if (aScore === -1 && bScore !== -1) return 1;
    return aScore - bScore;
  });
}
