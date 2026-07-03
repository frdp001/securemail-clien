/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes a secure SHA-256 hash representation of an email recipient and message ID.
 * This guarantees unique tracking records to completely neutralize auto-responder feedback loops.
 */
export async function computeMessageHash(recipient: string, messageId: string): Promise<string> {
  const encoder = new TextEncoder();
  const rawString = `${recipient.toLowerCase().trim()}:${messageId.trim()}`;
  const data = encoder.encode(rawString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Evaluates RFC 3834 standard headers to detect if an incoming message is automated or system-generated.
 * Auto-responders must NEVER reply to automated emails to prevent infinite cascade loops.
 */
export interface LoopDetectionResult {
  isLoopRisk: boolean;
  reason?: string;
}

export function evaluateLoopRisk(headers: {
  autoSubmitted?: string;
  precedence?: string;
  listId?: string;
  from?: string;
  subject?: string;
}): LoopDetectionResult {
  const autoSubmitted = (headers.autoSubmitted || "").toLowerCase().trim();
  const precedence = (headers.precedence || "").toLowerCase().trim();
  const listId = (headers.listId || "").toLowerCase().trim();
  const from = (headers.from || "").toLowerCase().trim();
  const subject = (headers.subject || "").toLowerCase().trim();

  // 1. Check Auto-Submitted header values (RFC 3834)
  if (autoSubmitted === "auto-replied" || autoSubmitted === "auto-generated") {
    return { isLoopRisk: true, reason: `Auto-Submitted header is "${headers.autoSubmitted}"` };
  }

  // 2. Check Precedence header values (commonly used by mailing lists or bulk systems)
  if (["bulk", "junk", "list", "list-owner"].includes(precedence)) {
    return { isLoopRisk: true, reason: `Precedence header is "${headers.precedence}"` };
  }

  // 3. Check List-ID (Mailing lists always have List-ID)
  if (listId !== "") {
    return { isLoopRisk: true, reason: `List-ID header present: "${headers.listId}"` };
  }

  // 4. Sender Address string heuristics (reject bounce handlers, mail delivery systems)
  const systemKeywords = [
    "noreply@", "no-reply@", "mailer-daemon@", "postmaster@", 
    "bounce-handler@", "bounce@", "autoresponse@", "donotreply@"
  ];
  for (const keyword of systemKeywords) {
    if (from.includes(keyword)) {
      return { isLoopRisk: true, reason: `System sender address pattern matched: "${keyword}"` };
    }
  }

  // 5. Subject keyword headers indicating automated delivery reports or status warnings
  const automaticSubjectKeywords = [
    "out of office", "delivery failure", "undeliverable", 
    "auto-response", "auto-reply", "vacation reply"
  ];
  for (const keyword of automaticSubjectKeywords) {
    if (subject.includes(keyword)) {
      return { isLoopRisk: true, reason: `Automated keyword detected in Subject: "${keyword}"` };
    }
  }

  return { isLoopRisk: false };
}

/**
 * Clean and extract raw email address from complex header representations
 * Example: "Lead Architect <architect@yourdomain.com>" -> "architect@yourdomain.com"
 */
export function extractEmailAddress(rawHeader: string): string {
  if (!rawHeader) return "";
  const match = rawHeader.match(/<([^>]+)>/);
  return (match ? match[1] : rawHeader).trim().toLowerCase();
}

/**
 * Generates a secure random Nonce string for injection into Content Security Policy (CSP) headers.
 * Protects client-side dashboards from inline injection or unauthorized script execution.
 */
export function generateSecurityNonce(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}
