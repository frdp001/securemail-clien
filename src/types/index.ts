/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Placeholder {
  key: string;
  label: string;
  desc: string;
}

export const PLACEHOLDER_REGISTRY: Record<string, Placeholder> = {
  "{{sender_name}}": {
    key: "{{sender_name}}",
    label: "Sender Display Name",
    desc: "The parsed name of the inbound sender."
  },
  "{{sender_email}}": {
    key: "{{sender_email}}",
    label: "Sender Email Address",
    desc: "The clean inbound sender email address."
  },
  "{{recipient_name}}": {
    key: "{{recipient_name}}",
    label: "Recipient Name",
    desc: "The name of the recipient (auto-responder account)."
  },
  "{{subject}}": {
    key: "{{subject}}",
    label: "Original Subject",
    desc: "The inbound message subject line."
  },
  "{{date}}": {
    key: "{{date}}",
    label: "Inbound Date/Time",
    desc: "The timestamp of when the original mail arrived."
  },
  "{{message_id}}": {
    key: "{{message_id}}",
    label: "Original Message-ID",
    desc: "For thread references & loop validation."
  },
  "{{thread_id}}": {
    key: "{{thread_id}}",
    label: "Conversation Thread ID",
    desc: "Unique thread tracking identifier."
  }
};

export function validateTemplatePlaceholders(template: string): { isValid: boolean; invalidPlaceholders: string[] } {
  if (!template) return { isValid: true, invalidPlaceholders: [] };
  const matches = template.match(/\{\{[^}]+\}\}/g) || [];
  const supported = Object.keys(PLACEHOLDER_REGISTRY);
  
  const invalidPlaceholders = matches.filter(m => !supported.includes(m));
  return {
    isValid: invalidPlaceholders.length === 0,
    invalidPlaceholders: Array.from(new Set(invalidPlaceholders))
  };
}

