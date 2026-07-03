/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Cloudflare Worker - Email Event Handler for Auto-Responder Loop Prevention
// Modeled for high reliability, cybersecurity resilience, and anti-loop validation.

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...args: any[]): D1PreparedStatement;
  first<T = any>(): Promise<T | null>;
  run(): Promise<any>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  DB: D1Database;               // Bind to Cloudflare D1 (SQL Engine)
  SENDER_DOMAIN: string;        // Domain this auto-responder replies from
  COOLDOWN_WINDOW_SECONDS: string; // Global cooldown rate-limit per sender address
}

// In Cloudflare Workers environment, the Email Message structure is defined in @cloudflare/workers-types
export interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  readonly raw: ReadableStream<Uint8Array>;
  readonly rawSize: number;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
  reply(mimeMessage: any): Promise<void>;
}

/**
 * Parses raw MIME headers if needed, fallback helper to inspect complex MIME boundaries
 */
async function parseRawMimeMessage(stream: ReadableStream<Uint8Array>): Promise<Record<string, string>> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let headerText = "";
  let done = false;

  // We only need the header section (up to the first double newline \\r\\n\\r\\n)
  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) {
      done = true;
      break;
    }
    headerText += decoder.decode(value, { stream: true });
    if (headerText.includes("\r\n\r\n") || headerText.includes("\n\n")) {
      break;
    }
  }
  // Release stream reader
  reader.releaseLock();

  const headers: Record<string, string> = {};
  const headerBlock = headerText.split(/\r?\n\r?\n/)[0] || "";
  const lines = headerBlock.split(/\r?\n/);
  
  let currentHeaderName = "";
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      // Folded header line
      if (currentHeaderName) {
        headers[currentHeaderName] += " " + line.trim();
      }
    } else {
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        currentHeaderName = line.substring(0, colonIndex).trim().toLowerCase();
        headers[currentHeaderName] = line.substring(colonIndex + 1).trim();
      }
    }
  }

  return headers;
}

/**
 * Computes a secure SHA-256 hash representation of the recipient and message-ID
 * to safely detect and prevent auto-responder loops in high concurrency.
 */
async function computeMessageHash(recipient: string, messageId: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretBuffer = encoder.encode(`${recipient.toLowerCase().trim()}:${messageId.trim()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", secretBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple email address extractor to strip out displays (e.g., "John Doe <john@doe.com>" -> "john@doe.com")
 */
function cleanEmailAddress(rawEmail: string): string {
  if (!rawEmail) return "";
  const match = rawEmail.match(/<([^>]+)>/);
  return (match ? match[1] : rawEmail).trim().toLowerCase();
}

/**
 * Parses and extracts a sender name/display name from an RFC 5322 From/To header value
 */
function extractName(rawHeader: string): string {
  if (!rawHeader) return "";
  const match = rawHeader.match(/^([^<]+)</);
  if (match) {
    return match[1].replace(/["']/g, "").trim();
  }
  const emailMatch = rawHeader.match(/<([^>]+)>/) || [null, rawHeader];
  const email = emailMatch[1] || rawHeader;
  const parts = email.split("@");
  return parts[0].trim();
}

/**
 * Replaces all literal placeholder variables with their evaluated dynamic values
 */
function parsePlaceholders(template: string, values: Record<string, string>): string {
  if (!template) return "";
  let result = template;
  for (const [key, val] of Object.entries(values)) {
    // Escape regex characters in placeholder keys (like { or })
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    result = result.replace(regex, val || "");
  }
  return result;
}

/**
 * Strict sanitization of outbound rich text to defend against XSS Injection
 */
function sanitizeOutputHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  let clean = rawHtml;

  // 1. Strip script tags and their inner content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[STRIPPED_SCRIPT]");

  // 2. Deep strip inline event handlers (e.g. onerror, onload, onclick, etc.) from all tags
  // Using multiple regexes to catch different quoting styles and unquoted values
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*["'][^"']*["']/gi, " [STRIPPED_EVENT]");
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*`[^`]*`/gi, " [STRIPPED_EVENT]");
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*[^\s>]+/gi, " [STRIPPED_EVENT]");

  // 3. Strip javascript: URIs
  clean = clean.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, "href='#blocked-protocol'");
  clean = clean.replace(/src\s*=\s*["']\s*javascript:[^"']*["']/gi, "src='#blocked-protocol'");

  // 4. Strip active element tags like iframes, objects, embeds, etc.
  clean = clean.replace(/<(iframe|object|embed|applet|form|meta|base|frameset)\b[^>]*>([\s\S]*?)<\/\1>/gi, "[STRIPPED_ACTIVE_ELEMENT]");
  clean = clean.replace(/<(iframe|object|embed|applet|form|meta|base|frameset)\b[^>]*\/?>/gi, "[STRIPPED_ACTIVE_ELEMENT]");

  return clean;
}

export default {
  async email(message: EmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const rawSender = message.from;
    const rawRecipient = message.to;
    
    const sender = cleanEmailAddress(rawSender);
    const recipient = cleanEmailAddress(rawRecipient);

    // 1. EXTRACT HEADERS & LOG ANALYSIS
    const rawMessageId = message.headers.get("Message-ID") || "";
    const autoSubmitted = (message.headers.get("Auto-Submitted") || "").toLowerCase();
    const precedence = (message.headers.get("Precedence") || "").toLowerCase();
    const listId = message.headers.get("List-ID") || "";
    const subject = message.headers.get("Subject") || "No Subject";

    console.log(`[SMTP-Receiver] Parsing message from: <${sender}> to <${recipient}> with Subject: "${subject}"`);

    // 2. DEFEND AGAINST SMTP LOOPS (HEADER-BASED SECURITY PRE-FILTERS)
    // Rule: RFC 3834 compliance. If the message matches automatic submission headers, do not reply.
    if (
      autoSubmitted === "auto-replied" || 
      autoSubmitted === "auto-generated" || 
      precedence === "bulk" || 
      precedence === "junk" || 
      precedence === "list" || 
      listId !== "" ||
      sender.includes("noreply") ||
      sender.includes("no-reply") ||
      sender.includes("mailer-daemon") ||
      sender.includes("postmaster")
    ) {
      console.warn(`[Anti-Loop Block] Automatic header detection flagged potential loop. Auto-Submitted: "${autoSubmitted}", Precedence: "${precedence}", Sender: "${sender}". Discarding auto-reply sequence.`);
      return;
    }

    // Fallback: Parse MIME body headers to verify no spoofed Header-IDs are nested inside the stream
    let mimeHeaders: Record<string, string> = {};
    try {
      mimeHeaders = await parseRawMimeMessage(message.raw);
    } catch (e) {
      console.warn(`[MIME-Parser Warning] Failed to parse raw stream headers: ${e}. Proceeding with envelope standard headers.`);
    }

    const resolvedMessageId = rawMessageId || mimeHeaders["message-id"] || "";
    if (!resolvedMessageId) {
      console.warn(`[Security Alert] Inbound message lacks a valid Message-ID header. Rejecting reply to prevent untracked cascades.`);
      return;
    }

    // Determine thread_id as the first listed ID in References, or fallback to current Message-ID
    const referencesHeader = message.headers.get("References") || mimeHeaders["references"] || "";
    const threadId = referencesHeader.trim().split(/\s+/)[0] || resolvedMessageId;

    // 3. CRYPTOGRAPHIC MESSAGE_ID HASHING FOR SECURE STATE TRACKING
    const messageHash = await computeMessageHash(recipient, resolvedMessageId);
    console.log(`[Anti-Loop] Computed transaction tracking hash: ${messageHash} for thread ID: ${threadId}`);

    // Verify D1 binding availability
    if (!env.DB) {
      console.error("[Configuration Error] D1 Database binding 'DB' is missing or unconfigured.");
      return;
    }

    // 4. QUERY D1 DATABASE FOR PREVIOUS MESSAGE IDENTIFIERS AND SENDER COOLDOWNS
    try {
      // Transaction-like checks inside SQLite D1
      // Check 1: Has this exact original message ID and recipient hash been processed?
      const existingRecord = await env.DB.prepare(
        "SELECT message_hash, status, replied_at FROM message_tracking WHERE message_hash = ?"
      )
      .bind(messageHash)
      .first<{ message_hash: string; status: string; replied_at: string }>();

      if (existingRecord) {
        console.warn(`[Anti-Loop Blocked] Loop intercepted! Hash '${messageHash}' already exists. Responded on: ${existingRecord.replied_at}. Aborting execution.`);
        return;
      }

      // Check 2: Has this conversation thread already received an auto-reply? (Thread/Loop suppression rule)
      const existingThreadRecord = await env.DB.prepare(
        "SELECT message_hash, status, replied_at FROM message_tracking WHERE thread_id = ? AND recipient_email = ? AND status = 'replied'"
      )
      .bind(threadId, recipient)
      .first<{ message_hash: string; status: string; replied_at: string }>();

      if (existingThreadRecord) {
        console.warn(`[Anti-Loop Blocked] Conversation thread level suppression! Conversation ID '${threadId}' has already received an auto-reply. Aborting execution to prevent redundant replies.`);
        return;
      }

      // Check 3: Cooldown check. Has this sender been auto-replied to within the last N seconds?
      const cooldownSeconds = parseInt(env.COOLDOWN_WINDOW_SECONDS as any) || 86400; // default 24 hours
      const recentReply = await env.DB.prepare(
        "SELECT message_hash FROM message_tracking WHERE sender_email = ? AND status = 'replied' AND datetime(replied_at) > datetime('now', ?)"
      )
      .bind(sender, `-${cooldownSeconds} seconds`)
      .first();

      if (recentReply) {
        console.info(`[Anti-Loop Suppression] Cooldown limits active for <${sender}>. Record stored as skipped to prevent spam.`);
        
        // Log skipped status to D1 to audit the block
        await env.DB.prepare(
          "INSERT INTO message_tracking (message_hash, recipient_email, sender_email, original_message_id, thread_id, status, anti_loop_flag) VALUES (?, ?, ?, ?, ?, 'blocked_cooldown', 0)"
        )
        .bind(messageHash, recipient, sender, resolvedMessageId, threadId)
        .run();
        return;
      }

      // 5. FETCH USER AUTO-RESPONDER CONFIGURATION AND HTML SIGNATURES
      const config = await env.DB.prepare(
        "SELECT is_active, subject_prefix, body_html, body_text FROM auto_responder_configs WHERE user_id = ?"
      )
      .bind(recipient)
      .first<{ is_active: number; subject_prefix: string; body_html: string; body_text: string }>();

      if (!config || config.is_active === 0) {
        console.log(`[Suppression] Auto-responder is inactive or unconfigured for <${recipient}>.`);
        return;
      }

      // Fetch user active signature to append
      const signature = await env.DB.prepare(
        "SELECT html_content, text_content FROM saved_signatures s JOIN user_settings u ON s.signature_id = u.default_signature_id WHERE u.user_id = ?"
      )
      .bind(recipient)
      .first<{ html_content: string; text_content: string }>();

      // 6. BUILD OUTBOUND ENVELOPE AND EXECUTE PLACEHOLDER PARSING & XSS MITIGATION
      const rawHtmlBody = `
        <div style="font-family: sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">
          ${config.body_html || ""}
        </div>
        ${signature?.html_content ? `<div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 13px; color: #64748b;">${signature.html_content}</div>` : ""}
      `;
      const rawTextBody = `${config.body_text || ""}\n\n${signature?.text_content || ""}`;

      // Set up values for Placeholder Parser
      const placeholderValues = {
        "{{sender_name}}": extractName(rawSender),
        "{{sender_email}}": sender,
        "{{recipient_name}}": extractName(rawRecipient),
        "{{subject}}": subject,
        "{{date}}": message.headers.get("Date") || new Date().toUTCString(),
        "{{message_id}}": resolvedMessageId,
        "{{thread_id}}": threadId
      };

      const parsedHtmlBody = parsePlaceholders(rawHtmlBody, placeholderValues);
      const parsedTextBody = parsePlaceholders(rawTextBody, placeholderValues);
      const parsedSubjectPrefix = parsePlaceholders(config.subject_prefix || "", placeholderValues);

      const safeHtmlBody = sanitizeOutputHtml(parsedHtmlBody);
      const plainTextBody = parsedTextBody;
      const replySubject = `${parsedSubjectPrefix}${subject}`;

      // Construct standard compliance headers for the outbound reply (RFC 3834 guidelines)
      const replyHeaders = new Headers();
      replyHeaders.set("Auto-Submitted", "auto-replied");
      replyHeaders.set("Precedence", "bulk");
      replyHeaders.set("In-Reply-To", resolvedMessageId);
      if (message.headers.get("References")) {
        replyHeaders.set("References", `${message.headers.get("References")} ${resolvedMessageId}`);
      } else {
        replyHeaders.set("References", resolvedMessageId);
      }

      // Send the auto-reply back through the mail transport layer
      await message.reply({
        subject: replySubject,
        html: safeHtmlBody,
        text: plainTextBody,
        headers: replyHeaders
      });

      // 7. WRITE THE TRACKING HASH TRANSACTIONALLY TO D1 TO FINALIZE THE PROTECTION LOOP
      await env.DB.prepare(
        "INSERT INTO message_tracking (message_hash, recipient_email, sender_email, original_message_id, thread_id, status, anti_loop_flag, incoming_references) VALUES (?, ?, ?, ?, ?, 'replied', 1, ?)"
      )
      .bind(
        messageHash,
        recipient,
        sender,
        resolvedMessageId,
        threadId,
        message.headers.get("References") || ""
      )
      .run();

      console.log(`[Auto-Responder Success] Auto-reply message successfully sent to <${sender}>. Message tracking logged.`);

    } catch (dbError) {
      console.error(`[Database Critical Error] D1 Execution failed during transactional lookups: ${dbError}`);
    }
  }
};
