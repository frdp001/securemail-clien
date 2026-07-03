/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import DOMPurify from "dompurify";

/**
 * Sanitizes rich-text HTML content using DOMPurify with strict defensive defaults.
 * Protects against XSS injection, dangerous event hooks (onerror, onload, onclick, etc.),
 * and malicious javascript: URIs.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  // Configure DOMPurify with a strict email-safe whitelist
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "span", "a", "img", "div", 
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", 
      "blockquote", "code", "pre", "hr", "table", "thead", "tbody", "tr", "th", "td"
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "target", "style", "class", 
      "width", "height", "align"
    ],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|cid|tel):|[^&:\/?#]*(?:[\/?#]|$))/i, // Allow secure web protocols + internal email IDs (cid)
    FORCE_BODY: true,
  });

  return cleanHtml;
}

/**
 * Deep backup regex filter to strip dangerous scripting elements and event handlers.
 * Useful for extra defense-in-depth or environments where DOMPurify context may run inside headless containers.
 * 
 * Specifically neutralizes:
 *  - <script> tag blocks
 *  - Inline handlers like onload, onerror, onclick, onmouseover, etc.
 *  - javascript: pseudo-protocol URIs
 *  - Embedded elements like iframes, embeds, objects, frameset, etc.
 */
export function deepStripDangerousMarkup(rawHtml: string): string {
  if (!rawHtml) return "";

  let cleaned = rawHtml;

  // 1. Neutralize script blocks completely
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[SECURITY_REMOVED_SCRIPT]");

  // 2. Neutralize event-handlers (e.g. onerror="...", onload=..., onclick='...')
  // Strips any on[attribute] assignments
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*["'][^"']*["']/gi, " [SECURITY_REMOVED_EVENT_HANDLER]");
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*`[^`]*`/gi, " [SECURITY_REMOVED_EVENT_HANDLER]");
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+\s*=\s*[^\s>]+/gi, " [SECURITY_REMOVED_EVENT_HANDLER]");

  // 3. Neutralize javascript: protocol links
  cleaned = cleaned.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, "href='#security-blocked-protocol'");

  // 4. Neutralize active components (iframes, objects, embedded flash/executables)
  cleaned = cleaned.replace(/<(iframe|object|embed|applet|form|meta|base|frameset)\b[^>]*>([\s\S]*?)<\/\1>/gi, "[SECURITY_REMOVED_ACTIVE_ELEMENT]");
  cleaned = cleaned.replace(/<(iframe|object|embed|applet|form|meta|base|frameset)\b[^>]*\/?>/gi, "[SECURITY_REMOVED_ACTIVE_ELEMENT]");

  return cleaned;
}
