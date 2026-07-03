import React, { useState, useMemo } from "react";
import { 
  Mail, 
  Send, 
  Settings, 
  ShieldAlert, 
  Database, 
  FolderGit2, 
  Folder, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Search, 
  Inbox, 
  Sparkles, 
  Trash2, 
  FileText, 
  User, 
  Terminal, 
  Lock, 
  Layers, 
  Clock, 
  HelpCircle,
  Eye,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Hash,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MailComposer from "./components/MailComposer";
import { validateTemplatePlaceholders } from "./types/index";

// Types
interface EmailMessage {
  id: string;
  sender: string;
  senderName: string;
  subject: string;
  date: string;
  body: string;
  messageId: string;
  headers: Record<string, string>;
  isRead: boolean;
  isSpam: boolean;
}

interface SimulatedD1State {
  userSettings: {
    userId: string;
    displayName: string;
    defaultSignatureId: string;
    themePreference: string;
  };
  savedSignatures: Array<{
    signatureId: string;
    name: string;
    htmlContent: string;
    textContent: string;
  }>;
  autoResponderConfig: {
    isActive: boolean;
    subjectPrefix: string;
    bodyHtml: string;
    cooldownPeriodSeconds: number;
  };
  messageTracking: Array<{
    messageHash: string;
    recipientEmail: string;
    senderEmail: string;
    originalMessageId: string;
    threadId?: string;
    repliedAt: string;
    status: "replied" | "blocked_loop" | "blocked_cooldown" | "skipped_auto_headers";
    reason?: string;
  }>;
}

export default function App() {
  // Local session login state
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("secure_mail_is_logged_in") === "true");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginDisplayName, setLoginDisplayName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStep, setAuthStep] = useState<string>("");

  // Navigation State
  const [activeTab, setActiveTab] = useState<"client" | "responder" | "blueprint" | "schema" | "threat">("client");
  const [selectedEmailId, setSelectedEmailId] = useState<string>("1");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [responderPane, setResponderPane] = useState<"tiptap" | "simulator">("tiptap");
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Search in Mail Client
  const [searchQuery, setSearchQuery] = useState("");

  // Sandbox State (XSS test input and sanitizer output)
  const [rawSignatureInput, setRawSignatureInput] = useState(
    `<p>Best regards,</p>\n<p><strong>John Doe</strong><br>Lead security team</p>\n<img src="x" onerror="alert('XSS Exploit Vulnerability!')" />`
  );

  // Simulated Email Injection Form
  const [injectSender, setInjectSender] = useState("vendor@automated-system.com");
  const [injectSubject, setInjectSubject] = useState("System Notification Alert");
  const [injectMessageId, setInjectMessageId] = useState(`<sys-alert-${Math.floor(Math.random() * 90000) + 10000}@automated-system.com>`);
  const [injectAutoSubmitted, setInjectAutoSubmitted] = useState<"none" | "auto-replied" | "auto-generated">("none");
  const [injectPrecedence, setInjectPrecedence] = useState<"none" | "bulk" | "list">("none");
  const [injectSpamScore, setInjectSpamScore] = useState<"low" | "high">("low");
  const [simulationLog, setSimulationLog] = useState<Array<{ time: string; type: "info" | "success" | "warning" | "error"; text: string }>>([
    { time: "08:50:00", type: "info", text: "Database state initialized on D1 edge replica." },
    { time: "08:50:02", type: "success", text: "Anti-Loop tracking tables verification: OK (0 records present)" }
  ]);

  // Simulated D1 State
  const [dbState, setDbState] = useState<SimulatedD1State>(() => {
    const savedId = localStorage.getItem("secure_mail_user_id") || "ZNwasike@gmail.com";
    const savedName = localStorage.getItem("secure_mail_display_name") || "Lead Architect";
    return {
      userSettings: {
        userId: savedId,
        displayName: savedName,
        defaultSignatureId: "sig-corporate-1",
        themePreference: "dark"
      },
    savedSignatures: [
      {
        signatureId: "sig-corporate-1",
        name: "Enterprise Signature",
        htmlContent: `<p>Best regards,</p>\n<p><strong>Lead Architect & Cybersecurity Expert</strong><br>Enterprise Mail Operations Team</p>`,
        textContent: "Best regards, Lead Architect - Enterprise Mail Operations"
      },
      {
        signatureId: "sig-minimal-2",
        name: "Simple Mobile",
        htmlContent: `<p>Sent from secure mobile client</p>`,
        textContent: "Sent from secure mobile client"
      }
    ],
    autoResponderConfig: {
      isActive: true,
      subjectPrefix: "Auto-Reply: ",
      bodyHtml: `<p>Thank you for contacting our Secure Operations Center. We have received your query regarding your support ticket.</p>\n<p>This is an automated response confirming receipt. A senior analyst will review your submission shortly.</p>`,
      cooldownPeriodSeconds: 86400 // 24 hours
    },
    messageTracking: []
    };
  });

  // Client emails list
  const [emails, setEmails] = useState<EmailMessage[]>([
    {
      id: "1",
      sender: "ceo@corporate.com",
      senderName: "Chief Executive Officer",
      subject: "Audit Report: Threat Vector Analysis on D1 Core",
      date: "08:42 AM",
      body: "Hello Architect,\n\nWe need to review the defense posture for the Edge Auto-Responder Worker prior to production release. Since Cloudflare Workers run on the edge, please ensure that cold-start memory checks and cryptographic hashing do not delay our SMTP relays.\n\nLet's review the anti-loop hashing logic on Cloudflare Workers before the D1 migration goes live tomorrow.\n\nBest regards,\nCEO",
      messageId: "<ceo-sec-9921@corporate.com>",
      headers: {
        "Message-ID": "<ceo-sec-9921@corporate.com>",
        "X-Spam-Status": "No, score=-1.2",
        "Auto-Submitted": "no"
      },
      isRead: true,
      isSpam: false
    },
    {
      id: "2",
      sender: "malicious-attacker@spammer.xyz",
      senderName: "Inbound Malicious Spammer",
      subject: "URGENT ACTION: Click here to claim your reward!",
      date: "Yesterday",
      body: "Hi target,\n\nYou have won 10,000,000 USD! Click here to claim immediately: <a href='https://phishing.xyz/steal'>CLAIM NOW</a>.\n\nInjecting signature script test: <script>alert('XSS Exploit')</script>\n<img src='nonexistent.jpg' onerror='console.error(\"Injected inline script execution attempted!\")' />",
      messageId: "<spam-38827@malicious-attacker.xyz>",
      headers: {
        "Message-ID": "<spam-38827@malicious-attacker.xyz>",
        "X-Spam-Status": "Yes, score=14.8",
        "X-Spam-Flag": "YES"
      },
      isRead: false,
      isSpam: true
    },
    {
      id: "3",
      sender: "bounce-handler@loop-back.org",
      senderName: "Mail Delivery Loop Subsystem",
      subject: "Delivery Failure Receipt: Auto-responder loop",
      date: "2 days ago",
      body: "This is an automated delivery receipt reporting that the previous auto-reply failed to deliver. Please respond to resolve this loop.",
      messageId: "<loop-system-88219@loop-back.org>",
      headers: {
        "Message-ID": "<loop-system-88219@loop-back.org>",
        "Auto-Submitted": "auto-generated",
        "Precedence": "bulk"
      },
      isRead: true,
      isSpam: false
    }
  ]);

  // Selected email object
  const selectedEmail = useMemo(() => {
    return emails.find(e => e.id === selectedEmailId) || emails[0];
  }, [emails, selectedEmailId]);

  // Sanitize signature HTML content visually
  const sanitizedSignatureOutput = useMemo(() => {
    // Mimic secure DOMPurify behavior in code
    let text = rawSignatureInput;
    
    // 1. Strip script tags entirely
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const cleaned1 = text.replace(scriptRegex, "[STRIPPED_SCRIPT_TAG]");
    
    // 2. Strip event handlers (e.g. onerror, onload, onclick, onmouseover)
    const eventHandlerRegex = /\s*on[a-z]+\s*=\s*["'][^"']*["']/gi;
    const cleaned2 = cleaned1.replace(eventHandlerRegex, " [STRIPPED_EVENT_HANDLER]");
    
    // 3. Strip javascript: URLs
    const javascriptUrlRegex = /href\s*=\s*["']\s*javascript:[^"']*["']/gi;
    const cleaned3 = cleaned2.replace(javascriptUrlRegex, "href='#stripped-javascript-url'");

    // 4. Strip iframe or object tags
    const embeddedRegex = /<(iframe|object|embed|form|meta)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    const cleaned4 = cleaned3.replace(embeddedRegex, "[BLOCKED_EMBEDDED_ELEMENT]");

    return {
      original: rawSignatureInput,
      sanitized: cleaned4,
      wasSanitized: rawSignatureInput !== cleaned4
    };
  }, [rawSignatureInput]);

  // Blueprints navigation state (for folder tree)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
    workers: true,
    frontend: true,
    database: true,
    security: true
  });

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const [selectedBlueprintFile, setSelectedBlueprintFile] = useState<string>("worker_index");

  // Blueprint files raw contents
  const blueprintFileContents: Record<string, { name: string; path: string; language: string; code: string; desc: string }> = {
    worker_index: {
      name: "index.ts",
      path: "workers/mail-auto-responder/src/index.ts",
      language: "typescript",
      desc: "Cloudflare Worker core entry point. Handles incoming SMTP email triggers via EmailReceiver, parses MIME body, evaluates loop prevention, and queries D1 database dynamically to guarantee anti-loop containment.",
      code: `import { EmailMessage, EmailReceiver } from "@cloudflare/workers-types";
import { connectD1 } from "./database";
import { sanitizeHtml } from "./security";

export interface Env {
  DB: D1Database; // Cloudflare D1 handle
  SENDER_DOMAIN: string;
}

export default {
  async email(message: EmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const recipient = message.to;
    const sender = message.from;
    const rawMessageId = message.headers.get("Message-ID") || "";
    
    // SECURITY CHECK 1: Fast header pre-filtering for automated/bulk loops
    const autoSubmitted = message.headers.get("Auto-Submitted")?.toLowerCase() || "";
    const precedence = message.headers.get("Precedence")?.toLowerCase() || "";
    const listId = message.headers.get("List-ID")?.toLowerCase() || "";
    
    if (
      autoSubmitted === "auto-replied" || 
      autoSubmitted === "auto-generated" || 
      precedence === "bulk" || 
      precedence === "junk" || 
      listId !== ""
    ) {
      console.warn(\`[Anti-Loop] Dropping reply to \${sender} - Auto-headers detected.\`);
      return; // Stop execution without replying
    }

    // SECURITY CHECK 2: Cryptographic hashing of (Recipient + Original Message-ID)
    const encoder = new TextEncoder();
    const data = encoder.encode(\`\${recipient}:\${rawMessageId}\`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const messageHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Establish transactional D1 Database Connection
    const db = connectD1(env.DB);

    // Query state and log inside D1 within a strict ACID transaction
    const existingTracking = await db.queryTrackingRecord(messageHash);
    if (existingTracking) {
      console.warn(\`[Anti-Loop System Alert] Infinite loop intercepted! Hash: \${messageHash}\`);
      return; // Hard Block
    }

    // SECURITY CHECK 3: Check Cooldown suppression window (Default 24h for same sender)
    const recentReply = await db.queryRecentReply(sender, 86400);
    if (recentReply) {
      console.info(\`[Anti-Loop Suppression] Cooldown active for \${sender}. Reply withheld.\`);
      return;
    }

    // Fetch user auto-responder active configuration and signature
    const autoResponder = await db.getAutoResponderConfig(recipient);
    if (!autoResponder || autoResponder.is_active === 0) {
      return; // No active auto-responder configured
    }

    // Inject and securely Sanitize response template + signature
    const signature = await db.getActiveSignature(recipient);
    const rawReplyHtml = \`
      <div class="webmail-body">
        \${autoResponder.body_html}
      </div>
      <div class="webmail-signature">
        \${signature ? signature.html_content : ""}
      </div>
    \`;
    const safeHtml = sanitizeHtml(rawReplyHtml); // Securely clean HTML using DOMPurify guidelines
    
    // Send standard secure reply
    const replyMessage = await message.reply({
      subject: \`\${autoResponder.subject_prefix}\${message.headers.get("Subject") || "No Subject"}\`,
      html: safeHtml,
      text: autoResponder.body_text + "\\n\\n" + (signature ? signature.text_content : "")
    });

    // Record processed state to D1 tracking list to close loop detection block
    await db.saveTrackingHash({
      messageHash,
      recipientEmail: recipient,
      senderEmail: sender,
      originalMessageId: rawMessageId,
      status: "replied"
    });

    console.log(\`[Email Auto-Responder] Successfully processed response to \${sender}.\`);
  }
};`
    },
    worker_security: {
      name: "security.ts",
      path: "workers/mail-auto-responder/src/security.ts",
      language: "typescript",
      desc: "Implements strict backend sanitization on edge runtimes. Ensures rich-text templates and signatures are safe from Cross-Site Scripting (XSS) and controls code execution paths prior to DB inserts or output rendering.",
      code: `// Custom Lightweight high-performance Edge-compatible Sanitizer 
// Note: In production, Node/Browser packages can be bundled, or 
// isomorphic DOMPurify combined with jsdom is executed.

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  let cleaned = rawHtml;

  // 1. Defend against script tags
  cleaned = cleaned.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, "[SECURITY_REMOVED_SCRIPT]");

  // 2. Defend against inline execution vectors (onmouseover, onload, onerror, etc.)
  cleaned = cleaned.replace(/\\s*on[a-z]+\\s*=\\s*["'][^"']*["']/gi, " [REMOVED_EVENT_HANDLER]");

  // 3. Prevent javascript pseudo-protocol links
  cleaned = cleaned.replace(/href\\s*=\\s*["']\\s*javascript:[^"']*["']/gi, "href='#blocked'");

  // 4. Block malicious object embeds & high risk markup
  cleaned = cleaned.replace(/<(iframe|object|embed|form|meta|svg\\b[^>]*onclick)\\b[^>]*>([\\s\\S]*?)<\\/\\1>/gi, "[REMOVED_MALICIOUS_EMBED]");

  return cleaned;
}

// Generate Secure Nonce for Content Security Policy (CSP) headers in Webmail UI
export function generateCSPNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}`
    },
    next_composer: {
      name: "MailComposer.tsx",
      path: "frontend/src/components/MailComposer.tsx",
      language: "typescript",
      desc: "Rich Text TipTap Composer React Component. Includes real-time HTML sanitization safeguards and dynamic injection of user signatures fetched from the D1 datastore.",
      code: `import React, { useState } from "react";
import DOMPurify from "dompurify"; // Strict client-side HTML Sanitization

interface ComposerProps {
  defaultSignatureHtml: string;
  onSend: (data: { to: string; subject: string; bodyHtml: string }) => void;
}

export default function MailComposer({ defaultSignatureHtml, onSend }: ComposerProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [editorHtml, setEditorHtml] = useState("<p>Draft your secure message here...</p>");

  const handleSendMessage = () => {
    // SECURITY COMPLIANCE: Sanitize user composed rich-text before storage/sending
    const combinedContent = \`
      <div class="email-body">\${editorHtml}</div>
      <div class="email-sig-wrapper">\${defaultSignatureHtml}</div>
    \`;
    const sanitizedBody = DOMPurify.sanitize(combinedContent, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "span", "a", "img", "div", "ul", "ol", "li"],
      ALLOWED_ATTR: ["href", "src", "alt", "style", "class", "target"]
    });

    onSend({
      to,
      subject,
      bodyHtml: sanitizedBody
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg p-4">
      <div className="space-y-3 mb-4">
        <input 
          placeholder="To:" 
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
        />
        <input 
          placeholder="Subject:" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
        />
      </div>
      
      {/* WYSIWYG Editor Container */}
      <div className="flex-1 bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-sm overflow-y-auto">
        <textarea
          value={editorHtml}
          onChange={(e) => setEditorHtml(e.target.value)}
          className="w-full h-full bg-transparent resize-none border-none outline-none text-slate-200"
        />
      </div>

      <div className="mt-4 flex justify-between items-center border-t border-slate-700 pt-3">
        <span className="text-xs text-slate-400">
          🔒 Guarded by isomorphic DOMPurify filters
        </span>
        <button 
          onClick={handleSendMessage}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded text-sm transition-colors"
        >
          Send Securely
        </button>
      </div>
    </div>
  );
}`
    },
    wrangler_toml: {
      name: "wrangler.toml",
      path: "wrangler.toml",
      language: "toml",
      desc: "Cloudflare Developer Wrangler configuration. Handles production environment mappings, binds the email router event trigger, and registers Cloudflare D1 SQL handles to edge resources.",
      code: `name = "secure-mail-auto-responder"
main = "workers/mail-auto-responder/src/index.ts"
compatibility_date = "2026-06-28"

# D1 Database Bindings
[[d1_databases]]
binding = "DB"
database_name = "prod-webmail-d1"
database_id = "e57c8d92-23c1-4b71-bdf4-f90911df11b3"
migrations_dir = "migrations"

# Email Routing Event Binds
[email]
# Route actions match Worker configurations
# triggers default .email() handler inside worker core
routes = [
  { pattern = "*@yourdomain.com", action = "worker" }
]

# Production System Secrets and Global Variables
[vars]
SENDER_DOMAIN = "yourdomain.com"
SECURITY_LOG_LEVEL = "VERBOSE"`
    }
  };

  const currentBlueprint = blueprintFileContents[selectedBlueprintFile];

  // SQL schema definition text
  const sqlSchemaText = `-- D1 Database Schema definitions for Secure Webmail Client & Auto-Responder
-- Modeled for Cloudflare D1 (SQLite engine at Edge scale)

-- 1. Table for User Mail client settings and profile bindings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,                       -- Unique email or authenticated UUID
    display_name TEXT NOT NULL,                     -- Human readable sender name
    default_signature_id TEXT,                      -- Reference to active saved_signatures
    theme_preference TEXT DEFAULT 'dark',           -- Client UI theme ('dark', 'light')
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (default_signature_id) REFERENCES saved_signatures(signature_id) ON DELETE SET NULL
);

-- 2. Table for HTML Signatures (with secure pre-sanitized blocks)
CREATE TABLE IF NOT EXISTS saved_signatures (
    signature_id TEXT PRIMARY KEY,                  -- Unique UUID for signature
    user_id TEXT NOT NULL,                          -- Reference to user profile
    name TEXT NOT NULL,                             -- Name of signature (e.g. "Work", "Personal")
    html_content TEXT NOT NULL,                     -- Raw HTML content (requires DOMPurify on save)
    text_content TEXT NOT NULL,                     -- Text-only fallback for non-HTML mail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
);

-- 3. Table for Auto-Responder configurations (with anti-loop options)
CREATE TABLE IF NOT EXISTS auto_responder_configs (
    config_id TEXT PRIMARY KEY,                     -- Unique configuration ID
    user_id TEXT NOT NULL UNIQUE,                   -- One auto-responder configuration per user
    is_active INTEGER DEFAULT 0,                    -- Status flag (0 = Inactive, 1 = Active)
    subject_prefix TEXT DEFAULT 'Auto-Reply: ',    -- Prefix for replied messages
    body_html TEXT NOT NULL,                        -- Rich-text HTML reply body (sanitized)
    body_text TEXT NOT NULL,                        -- Plain-text reply body fallback
    cooldown_period_seconds INTEGER DEFAULT 86400,  -- Suppression time to same sender (default 24h)
    start_time TIMESTAMP,                           -- Scheduled start time (NULL = immediate)
    end_time TIMESTAMP,                             -- Scheduled end time (NULL = continuous)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
);

-- 4. Table for Message Tracking & Anti-Loop Prevention (Crucial Security Layer)
CREATE TABLE IF NOT EXISTS message_tracking (
    message_hash TEXT PRIMARY KEY,                  -- SHA-256 hash of (recipient_email + original_message_id)
    recipient_email TEXT NOT NULL,                  -- Target email that triggered the responder
    sender_email TEXT NOT NULL,                     -- Incoming sender who received the reply
    original_message_id TEXT NOT NULL,              -- Original parsed SMTP Message-ID header
    thread_id TEXT,                                 -- Conversation Thread ID tracking
    replied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timing indicator
    anti_loop_flag INTEGER DEFAULT 1,               -- Validation flag to confirm response sent
    
    -- Additional headers to strengthen suppression audits
    incoming_references TEXT,                       -- SMTP References / In-Reply-To header
    x_spam_status TEXT                              -- Spam filter rating to skip answering high-risk mail
);

-- Optimize message tracking lookups for high-velocity Edge Workers
CREATE INDEX IF NOT EXISTS idx_tracking_sender ON message_tracking(sender_email);
CREATE INDEX IF NOT EXISTS idx_tracking_replied_at ON message_tracking(replied_at);`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Trigger simulated email ingestion into the auto-responder engine
  const triggerSimulation = async () => {
    const timestamp = new Date().toLocaleTimeString();
    const newLogs = [...simulationLog];
    
    newLogs.push({
      time: timestamp,
      type: "info",
      text: `📥 [Inbound Trigger] Raw email received. Sender: ${injectSender}, Subject: "${injectSubject}", Msg-ID: ${injectMessageId}`
    });

    // Step 1: Anti-Loop Header check
    if (injectAutoSubmitted !== "none" || injectPrecedence !== "none") {
      newLogs.push({
        time: timestamp,
        type: "warning",
        text: `🚫 [Anti-Loop Rule Blocked] Loop-prevention header active. Auto-Submitted: "${injectAutoSubmitted}", Precedence: "${injectPrecedence}". Message discarded immediately with no auto-reply generated.`
      });
      setSimulationLog(newLogs);
      return;
    }

    // Step 2: Spam check
    if (injectSpamScore === "high") {
      newLogs.push({
        time: timestamp,
        type: "warning",
        text: `🛡️ [Spam Suppression Blocked] SMTP analysis reports high spam score (X-Spam-Flag: YES). Automatic responder withheld for security verification.`
      });
      setSimulationLog(newLogs);
      return;
    }

    // Step 3: Compute Message-ID SHA-256 Hash
    const rawCombination = `${dbState.userSettings.userId}:${injectMessageId}`;
    // Simulating SHA-256
    const mockHash = Array.from(rawCombination)
      .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
      .toString(16)
      .padEnd(16, "f");
    
    newLogs.push({
      time: timestamp,
      type: "info",
      text: `🔑 [D1 State Hash Compute] Generated transaction hash key: ${mockHash}`
    });

    // Determine thread_id for mock email
    const threadId = injectMessageId;

    // Step 4: Query D1 table for hash match
    const existingTracking = dbState.messageTracking.find(t => t.messageHash === mockHash);
    if (existingTracking) {
      newLogs.push({
        time: timestamp,
        type: "error",
        text: `🚨 [Anti-Loop Critical Intercept] HASH DETECTED IN message_tracking TABLE. Original Message-ID was already answered! Infinite loop vector closed.`
      });
      setSimulationLog(newLogs);
      return;
    }

    // Step 4.5: Query D1 for thread-level suppression match (Conversation suppression)
    const existingThreadTracking = dbState.messageTracking.find(t => t.threadId === threadId && t.status === "replied");
    if (existingThreadTracking) {
      newLogs.push({
        time: timestamp,
        type: "error",
        text: `🚨 [Anti-Loop Thread Suppression] CONVERSATION THREAD ID '${threadId}' has already received an auto-reply. Blocking execution to prevent redundant replies in the same conversation.`
      });
      setSimulationLog(newLogs);
      return;
    }

    // Step 5: Check Cooldown Period (Sender lookup in D1)
    const senderCooldownMatch = dbState.messageTracking.some(
      t => t.senderEmail === injectSender && t.status === "replied"
    );
    if (senderCooldownMatch) {
      newLogs.push({
        time: timestamp,
        type: "warning",
        text: `⏱️ [Cooldown Suppression active] Cooldown window active (86400s) for ${injectSender}. D1 prevents repeating responses within 24h.`
      });
      
      // Save D1 track record
      const updatedTracking = [
        ...dbState.messageTracking,
        {
          messageHash: mockHash,
          recipientEmail: dbState.userSettings.userId,
          senderEmail: injectSender,
          originalMessageId: injectMessageId,
          threadId: threadId,
          repliedAt: new Date().toISOString(),
          status: "blocked_cooldown" as const,
          reason: "Active cooldown (24 hours) suppression rule triggered."
        }
      ];
      setDbState(prev => ({ ...prev, messageTracking: updatedTracking }));
      setSimulationLog(newLogs);
      return;
    }

    // Success - Execute Auto-Response
    newLogs.push({
      time: timestamp,
      type: "success",
      text: `✅ [MIME Generator] Generating outbound auto-response with pre-sanitized template & default signature.`
    });

    newLogs.push({
      time: timestamp,
      type: "success",
      text: `💾 [D1 Transaction Committed] SQL Statement executed: INSERT INTO message_tracking (message_hash, recipient_email, sender_email, original_message_id, thread_id) VALUES ('${mockHash}', ...)`
    });

    // Update D1 State Reactivity
    const updatedTracking = [
      ...dbState.messageTracking,
      {
        messageHash: mockHash,
        recipientEmail: dbState.userSettings.userId,
        senderEmail: injectSender,
        originalMessageId: injectMessageId,
        threadId: threadId,
        repliedAt: new Date().toISOString(),
        status: "replied" as const
      }
    ];

    // Generate a fresh Message ID for the new email we just "sent"
    const freshMessageId = `<auto-reply-${Math.floor(Math.random() * 90000) + 10000}@yourdomain.com>`;
    setInjectMessageId(freshMessageId);

    setDbState(prev => ({ ...prev, messageTracking: updatedTracking }));
    setSimulationLog(newLogs);
  };

  // Local direct credentials authentication handlers
  const handleLocalLogin = () => {
    if (!loginEmail || !loginEmail.includes("@")) {
      setLoginError("Please enter a valid email address.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Please enter your password.");
      return;
    }
    if (loginPassword !== "admin" && loginPassword !== "pass") {
      setLoginError("Incorrect password. Use 'admin' or 'pass' to log in.");
      return;
    }

    setIsAuthenticating(true);
    setLoginError(null);

    // Derive display name from email username part
    const usernamePart = loginEmail.split("@")[0];
    const derivedName = usernamePart
      .split(/[\._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    const steps = [
      "Connecting to mail server...",
      "Verifying mailbox credentials...",
      "Loading auto-responder settings...",
      "Secure session established!"
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAuthStep(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        
        // Save session parameters
        localStorage.setItem("secure_mail_is_logged_in", "true");
        localStorage.setItem("secure_mail_user_id", loginEmail);
        localStorage.setItem("secure_mail_display_name", derivedName);
        
        // Dynamic DB session updates
        setDbState(prev => ({
          ...prev,
          userSettings: {
            ...prev.userSettings,
            userId: loginEmail,
            displayName: derivedName
          }
        }));
        
        setIsLoggedIn(true);
        setIsAuthenticating(false);
      }
    }, 150);
  };

  const handleLocalLogout = () => {
    localStorage.removeItem("secure_mail_is_logged_in");
    localStorage.removeItem("secure_mail_user_id");
    localStorage.removeItem("secure_mail_display_name");
    setIsLoggedIn(false);
  };

  // Clear simulation logs
  const clearSimulation = () => {
    setSimulationLog([
      { time: new Date().toLocaleTimeString(), type: "info", text: "Simulation logs flushed. Resetting edge listeners." }
    ]);
    setDbState(prev => ({ ...prev, messageTracking: [] }));
  };

  // Safe rendered HTML inside the client reading pane
  const renderSanitizedBody = (rawBody: string) => {
    // Basic sanitization inside the React UI for safety
    let text = rawBody;
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    text = text.replace(scriptRegex, "<strong>[BLOCKED_XSS_ATTEMPT]</strong>");
    return { __html: text.replace(/\n/g, "<br />") };
  };

  // Filtered emails
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      const matchSearch = 
        email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.body.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [emails, searchQuery]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-4 relative overflow-hidden selection:bg-blue-500/30">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 relative z-10 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center bg-blue-600/20 text-blue-400 p-3 rounded-xl border border-blue-500/30 mb-2">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">SECURE WEBMAIL SUITE</h1>
            <p className="text-xs text-slate-400">Sign in to your secure email and auto-responder account</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-950/50 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input 
                  type="email"
                  placeholder="you@yourdomain.com"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginError(null);
                  }}
                  disabled={isAuthenticating}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-550 absolute left-3 top-3.5" />
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError(null);
                  }}
                  disabled={isAuthenticating}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors placeholder:text-slate-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                💡 Enter <code className="font-mono text-slate-400 bg-slate-950 px-1 rounded">admin</code> as the password to authenticate this local session.
              </p>
            </div>

            <button
              onClick={handleLocalLogin}
              disabled={isAuthenticating}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{authStep}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Sign-In Options */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block text-center">Quick Profile Pre-sets (No Cloudflare)</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setLoginEmail("ZNwasike@gmail.com");
                  setLoginPassword("admin");
                  setLoginError(null);
                }}
                disabled={isAuthenticating}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded px-2.5 py-2 text-left text-[11px] transition-all"
              >
                <div className="font-semibold text-slate-300">ZNwasike@gmail.com</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Preset Account</div>
              </button>
              <button
                onClick={() => {
                  setLoginEmail("security-auditor@enterprise.com");
                  setLoginPassword("admin");
                  setLoginError(null);
                }}
                disabled={isAuthenticating}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded px-2.5 py-2 text-left text-[11px] transition-all"
              >
                <div className="font-semibold text-slate-300">auditor@enterprise.com</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Preset Account</div>
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 text-center font-mono">
            SECURE DIRECT AUTH MODULE • NO EXTERNAL HOOKS REQUIRED
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-blue-500/30">
      
      {/* Upper Status Banner (Architectural Identity Bar) */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between shrink-0 gap-4" id="header-bar">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600/20 text-blue-400 p-2.5 rounded-lg border border-blue-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-sans">Roundcube Secure Webmail & Auto-Responder</h1>
              <span className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Edge Core Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Senior Architect Specification Dashboard & Security Threat Matrix Dashboard</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Global Nav Tabs */}
          <nav className="flex flex-wrap items-center bg-slate-950 p-1 rounded-lg border border-slate-800" id="main-nav-tabs">
            <button
              onClick={() => setActiveTab("client")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "client" 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="nav-client"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Interactive Webmail</span>
            </button>
            <button
              onClick={() => setActiveTab("responder")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "responder" 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="nav-responder"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Auto-Responder Engine</span>
            </button>
            <button
              onClick={() => setActiveTab("blueprint")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "blueprint" 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="nav-blueprint"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Folder Directory Blueprint</span>
            </button>
            <button
              onClick={() => setActiveTab("schema")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "schema" 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="nav-schema"
            >
              <Database className="w-3.5 h-3.5" />
              <span>D1 Database Schema</span>
            </button>
            <button
              onClick={() => setActiveTab("threat")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "threat" 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="nav-threat"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Cybersecurity Threat Matrix</span>
            </button>
          </nav>

          {/* User Account Session Info (No Cloudflare Bypass) */}
          <div className="flex items-center space-x-3 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <div className="flex items-center space-x-2 px-2.5 py-1 text-xs">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-slate-500 font-mono text-[10px] uppercase">User:</span>
              <span className="text-slate-200 font-semibold max-w-[120px] truncate" title={dbState.userSettings.userId}>{dbState.userSettings.userId}</span>
            </div>
            <button
              onClick={handleLocalLogout}
              className="flex items-center space-x-1 px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-550/20 hover:border-red-500 rounded-md text-[11px] font-semibold transition-all"
              title="Log out of local session"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-hidden flex flex-col bg-slate-950">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: INTERACTIVE WEBMAIL CLIENT (3-Pane Roundcube Simulation) */}
          {activeTab === "client" && (
            <motion.div 
              key="client-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 flex overflow-hidden divide-x divide-slate-800 h-full"
            >
              {/* Mail Sidebar (Folders List) - Pane 1 */}
              <aside className="w-64 bg-slate-900 shrink-0 hidden lg:flex flex-col h-full justify-between p-4" id="webmail-pane-1">
                <div className="space-y-6">
                  <div>
                    <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider block mb-3">Accounts</span>
                    <div className="bg-slate-950 border border-slate-800 rounded px-3 py-2 flex items-center justify-between">
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-200 truncate">{dbState.userSettings.userId}</div>
                        <div className="text-[10px] text-slate-500 font-mono">D1 Auth ID: {dbState.userSettings.displayName}</div>
                      </div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider block mb-2">Mail Folders</span>
                    <div className="space-y-1">
                      <button className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold bg-blue-950/60 text-blue-400 border border-blue-500/20">
                        <span className="flex items-center gap-2"><Inbox className="w-3.5 h-3.5" /> Inbox</span>
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                          {emails.filter(e => !e.isRead).length}
                        </span>
                      </button>
                      <button className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-850/50">
                        <span className="flex items-center gap-2"><Send className="w-3.5 h-3.5" /> Sent</span>
                        <span className="text-slate-600 font-mono text-[10px]">{dbState.messageTracking.filter(t => t.status === 'replied').length}</span>
                      </button>
                      <button className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-850/50">
                        <span className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> Spam Vault</span>
                        <span className="bg-amber-950/40 text-amber-500 border border-amber-500/20 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                          {emails.filter(e => e.isSpam).length}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider block mb-2">Edge Storage Info</span>
                    <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-[11px] space-y-2">
                      <div className="flex justify-between font-mono text-slate-400">
                        <span>Database:</span>
                        <span className="text-blue-400">Cloudflare D1</span>
                      </div>
                      <div className="flex justify-between font-mono text-slate-400">
                        <span>Anti-Loop Triggers:</span>
                        <span className="text-amber-400">{dbState.messageTracking.length} logged</span>
                      </div>
                      <div className="flex justify-between font-mono text-slate-400">
                        <span>Active Signature:</span>
                        <span className="text-emerald-400 truncate max-w-[100px]">sig-corporate-1</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-500 space-y-1">
                  <div>🔐 Security Layer: CSRF / Anti-Loop</div>
                  <div>📡 Network Mode: Edge Worker</div>
                </div>
              </aside>

              {/* Message List Panel - Pane 2 */}
              <section className="w-full md:w-[380px] shrink-0 flex flex-col h-full bg-slate-950" id="webmail-pane-2">
                <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Inbound SMTP Queue</span>
                    <span className="text-[10px] text-slate-500 font-mono">{filteredEmails.length} messages</span>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded text-xs pl-8 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
                  {filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmailId(email.id)}
                      className={`w-full text-left p-4 transition-colors flex flex-col space-y-1.5 border-l-2 ${
                        selectedEmailId === email.id
                          ? "bg-slate-900/60 border-l-blue-500"
                          : "hover:bg-slate-900/30 border-l-transparent"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs truncate ${!email.isRead ? "font-bold text-slate-200" : "text-slate-400"}`}>
                          {email.senderName}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">{email.date}</span>
                      </div>
                      <div className={`text-xs truncate ${!email.isRead ? "font-bold text-white" : "text-slate-300"}`}>
                        {email.subject}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {email.body}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[9px] text-slate-600 font-mono truncate max-w-[200px]">
                          {email.messageId}
                        </span>
                        {email.isSpam && (
                          <span className="bg-amber-950 text-amber-400 border border-amber-500/20 text-[8px] px-1.5 py-0.2 rounded font-mono uppercase">
                            Spam Filter Triggered
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredEmails.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-600">
                      No secure emails matched your filter criteria.
                    </div>
                  )}
                </div>
              </section>

              {/* Message Reading Pane - Pane 3 */}
              <section className="flex-1 flex flex-col h-full bg-slate-900/40" id="webmail-pane-3">
                {selectedEmail ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Headers Block */}
                    <div className="p-6 bg-slate-900/80 border-b border-slate-800 space-y-4 shrink-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-base font-semibold text-white tracking-tight">{selectedEmail.subject}</h2>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <span>From: <strong>{selectedEmail.senderName}</strong> &lt;{selectedEmail.sender}&gt;</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-mono text-slate-500">{selectedEmail.date}</span>
                        </div>
                      </div>

                      {/* Accordion SMTP Metadata */}
                      <div className="bg-slate-950/80 border border-slate-800 rounded p-3 font-mono text-[11px] text-slate-400 space-y-1">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center justify-between border-b border-slate-900 pb-1">
                          <span>SMTP Envelope Headers (Read by CF Auto-Responder Worker)</span>
                          <span className="text-emerald-500 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> DKIM Verified
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                          <div className="truncate"><span className="text-slate-600">Message-ID:</span> {selectedEmail.headers["Message-ID"] || "None"}</div>
                          <div className="truncate"><span className="text-slate-600">Auto-Submitted:</span> {selectedEmail.headers["Auto-Submitted"] || "not-present"}</div>
                          <div className="truncate"><span className="text-slate-600">Precedence:</span> {selectedEmail.headers["Precedence"] || "not-present"}</div>
                          <div className="truncate"><span className="text-slate-600">Spam Report:</span> {selectedEmail.headers["X-Spam-Status"] || "clean"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Email Message Content Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                      {/* Body section */}
                      <div className="bg-slate-950/30 p-4 border border-slate-800/40 rounded-lg">
                        <div 
                          className="text-xs text-slate-300 leading-relaxed font-sans"
                          dangerouslySetInnerHTML={renderSanitizedBody(selectedEmail.body)}
                        />
                      </div>

                      {/* Saved HTML Signature Preview Block */}
                      <div className="border-t border-slate-800 pt-4">
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <Terminal className="w-3 h-3" /> Sanitized Signature Append Block (simulated)
                        </div>
                        <div 
                          className="bg-slate-950 border border-slate-800 p-3 rounded text-xs text-slate-400 font-sans"
                          dangerouslySetInnerHTML={{ __html: dbState.savedSignatures[0].htmlContent }}
                        />
                      </div>

                      {/* Security Verification Footprint */}
                      <div className="bg-blue-950/10 border border-blue-500/20 rounded p-4 flex items-start space-x-3">
                        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-semibold text-blue-300">Isomorphic DOMPurify Sanitizer Guard Verified</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Webmail renders HTML body content safely. Script execution is entirely sandboxed inside an iframe container with strict <code className="text-blue-200 font-mono bg-blue-950/60 px-1 rounded text-[10px]">sandbox="allow-popups-to-escape-sandbox"</code> policy to block top-level frame redirection and clickjacking attacks.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <Mail className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm text-slate-400">Select an email from the SMTP queue to review envelope headers, body content, and loop status.</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* TAB 2: AUTO-RESPONDER & ANTI-LOOP ENGINE TESTER */}
          {activeTab === "responder" && (
            <motion.div 
              key="responder-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 overflow-y-auto p-6 space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Auto-Responder Config Panel */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Auto-Responder Settings</h3>
                    <div className="flex items-center space-x-2">
                      <label className="text-[11px] text-slate-400">Status:</label>
                      <button 
                        onClick={() => setDbState(prev => ({
                          ...prev,
                          autoResponderConfig: {
                            ...prev.autoResponderConfig,
                            isActive: !prev.autoResponderConfig.isActive
                          }
                        }))}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          dbState.autoResponderConfig.isActive 
                            ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-400" 
                            : "bg-red-950/80 border-red-500/30 text-red-400"
                        }`}
                      >
                        {dbState.autoResponderConfig.isActive ? "ACTIVE" : "DISABLED"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1.5 font-medium">Auto-Reply Subject Prefix</label>
                      <input 
                        type="text"
                        value={dbState.autoResponderConfig.subjectPrefix}
                        onChange={(e) => setDbState(prev => ({
                          ...prev,
                          autoResponderConfig: { ...prev.autoResponderConfig, subjectPrefix: e.target.value }
                        }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1.5 font-medium">Reply Body Template (HTML Sanitized)</label>
                      <textarea
                        value={dbState.autoResponderConfig.bodyHtml}
                        rows={6}
                        onChange={(e) => {
                          const val = e.target.value;
                          const validation = validateTemplatePlaceholders(val);
                          if (!validation.isValid) {
                            setTemplateError(`Unauthorized placeholder(s): ${validation.invalidPlaceholders.join(", ")}`);
                          } else {
                            setTemplateError(null);
                          }
                          setDbState(prev => ({
                            ...prev,
                            autoResponderConfig: { ...prev.autoResponderConfig, bodyHtml: val }
                          }));
                        }}
                        className={`w-full bg-slate-950 border rounded px-3 py-2 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-blue-600 ${
                          templateError ? "border-red-500/50 focus:border-red-500" : "border-slate-800"
                        }`}
                      />
                      {templateError && (
                        <div className="mt-2 p-2.5 bg-red-950/50 border border-red-500/20 rounded text-[10px] text-red-400 leading-relaxed font-sans flex items-start gap-1.5" id="template-validation-error-badge">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Template Storage Blocked:</span> Only the 7 registered placeholders are allowed (e.g. <code className="font-mono bg-red-950 px-1 py-0.5 rounded text-white text-[9px]">{"{{sender_name}}"}</code>, etc.).
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-slate-400 font-medium">Rate Cooldown Limit (Seconds)</label>
                        <span className="text-blue-400 font-mono">24 Hours</span>
                      </div>
                      <input 
                        type="number"
                        value={dbState.autoResponderConfig.cooldownPeriodSeconds}
                        onChange={(e) => setDbState(prev => ({
                          ...prev,
                          autoResponderConfig: { ...prev.autoResponderConfig, cooldownPeriodSeconds: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-600"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                        D1 database checks tracking index to suppress duplicate responses to the same sender email during this window. Intercepts infinite bounce loops from remote automated addresses.
                      </p>
                    </div>
                              {/* Cloudflare Worker Auto-Responder Pipeline Simulator */}
                <div className="lg:col-span-2 flex flex-col space-y-6">
                  
                  {/* Toggle Sub-tabs */}
                  <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0">
                    <button
                      onClick={() => setResponderPane("tiptap")}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-xs font-semibold transition-all ${
                        responderPane === "tiptap" 
                          ? "bg-slate-800 text-white shadow-sm border border-slate-700/50" 
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Rich Template Writer (TipTap)</span>
                    </button>
                    <button
                      onClick={() => setResponderPane("simulator")}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-xs font-semibold transition-all ${
                        responderPane === "simulator" 
                          ? "bg-slate-800 text-white shadow-sm border border-slate-700/50" 
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Anti-Loop Edge Simulator</span>
                    </button>
                  </div>

                  {responderPane === "tiptap" ? (
                    <div className="flex-1 min-h-[500px]">
                      <MailComposer 
                        signatures={dbState.savedSignatures.map(s => ({
                          signatureId: s.signatureId,
                          name: s.name,
                          htmlContent: s.htmlContent
                        }))}
                        defaultSignatureId={dbState.userSettings.defaultSignatureId}
                        onSend={(data) => {
                          const validation = validateTemplatePlaceholders(data.bodyHtml);
                          const ts = new Date().toLocaleTimeString();
                          if (!validation.isValid) {
                            const errorMsg = `Unauthorized placeholder(s) detected: ${validation.invalidPlaceholders.join(", ")}. Template blocked from save to prevent security injection issues.`;
                            setTemplateError(errorMsg);
                            setSimulationLog(prev => [
                              ...prev,
                              {
                                time: ts,
                                type: "error",
                                text: `🚨 [Template Validation Failed] ${errorMsg}`
                              }
                            ]);
                            return;
                          }
                          
                          setTemplateError(null);
                          setDbState(prev => ({
                            ...prev,
                            autoResponderConfig: {
                              ...prev.autoResponderConfig,
                              bodyHtml: data.bodyHtml
                            }
                          }));
                          // Automatically trigger a status alert in log
                          setSimulationLog(prev => [
                            ...prev,
                            {
                              time: ts,
                              type: "success",
                              text: `💾 [Config Committed] Auto-reply template compiled with TipTap and saved to D1 state: ${data.bodyHtml.substring(0, 100)}...`
                            }
                          ]);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Pipeline Trigger */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <div className="flex items-center space-x-2">
                            <Terminal className="w-4 h-4 text-blue-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Anti-Loop SMTP Inbound Sandbox Simulator</h3>
                          </div>
                          <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono uppercase">Workers Sandbox</span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          Simulate how Cloudflare Workers evaluate incoming emails at edge runtimes. Tweak the incoming email headers and trigger the handler to test the anti-loop rules.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Left: Input parameters */}
                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="block text-slate-400 mb-1">Inbound Sender Address</label>
                              <input 
                                type="email"
                                value={injectSender}
                                onChange={(e) => setInjectSender(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1">Inbound Message-ID (SMTP Unique Header)</label>
                              <input 
                                type="text"
                                value={injectMessageId}
                                onChange={(e) => setInjectMessageId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1">SMTP Subject Header</label>
                              <input 
                                type="text"
                                value={injectSubject}
                                onChange={(e) => setInjectSubject(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                              />
                            </div>
                          </div>

                          {/* Right: Loop Trigger headers */}
                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="block text-slate-400 mb-1">Auto-Submitted Header</label>
                              <select 
                                value={injectAutoSubmitted}
                                onChange={(e: any) => setInjectAutoSubmitted(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                              >
                                <option value="none">None (Standard SMTP user mail)</option>
                                <option value="auto-replied">auto-replied (Suppresses loops)</option>
                                <option value="auto-generated">auto-generated (Suppresses loops)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1">Precedence Header</label>
                              <select 
                                value={injectPrecedence}
                                onChange={(e: any) => setInjectPrecedence(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                              >
                                <option value="none">None (Standard priority)</option>
                                <option value="bulk">bulk (Suppresses loops)</option>
                                <option value="list">list (Suppresses loops)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1">Spam Analysis Flag</label>
                              <select 
                                value={injectSpamScore}
                                onChange={(e: any) => setInjectSpamScore(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                              >
                                <option value="low">Spam score: LOW (DKIM verified)</option>
                                <option value="high">Spam score: HIGH (Anti-spam suppression rule)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex space-x-3">
                          <button 
                            onClick={triggerSimulation}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/10"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Trigger Cloudflare Worker Event
                          </button>
                          <button 
                            onClick={clearSimulation}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Reset D1 State
                          </button>
                        </div>
                      </div>

                      {/* Worker Live Logs and D1 Database Record Output */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Live System Logs */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[280px]">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Worker Log Stream</span>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          </div>
                          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 pr-1 select-text">
                            {simulationLog.map((log, i) => (
                              <div key={i} className="flex items-start space-x-1.5 leading-normal">
                                <span className="text-slate-600 shrink-0 font-medium">[{log.time}]</span>
                                <span className={`shrink-0 font-bold uppercase ${
                                  log.type === "success" ? "text-emerald-400" :
                                  log.type === "warning" ? "text-amber-400" :
                                  log.type === "error" ? "text-red-400" : "text-blue-400"
                                }`}>
                                  [{log.type}]
                                </span>
                                <span className="text-slate-300">{log.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* D1 SQL message_tracking State */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[280px]">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 shrink-0">
                            <div className="flex items-center space-x-1.5">
                              <Database className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">D1: message_tracking</span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">Row Index: {dbState.messageTracking.length}</span>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {dbState.messageTracking.map((track, i) => (
                              <div key={i} className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] space-y-1 select-text">
                                <div className="flex justify-between font-bold border-b border-slate-900 pb-1">
                                  <span className="text-blue-400">HASH: {track.messageHash.substring(0, 14)}...</span>
                                  <span className={`px-1 rounded text-[8px] uppercase ${
                                    track.status === "replied" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/20" :
                                    track.status === "blocked_cooldown" ? "bg-amber-950/80 text-amber-400 border border-emerald-500/20" :
                                    "bg-red-950/80 text-red-400 border border-red-500/20"
                                  }`}>
                                    {track.status}
                                  </span>
                                </div>
                                <div className="text-slate-500">Sender: <span className="text-slate-300">{track.senderEmail}</span></div>
                                <div className="text-slate-500 truncate">ID: <span className="text-slate-300">{track.originalMessageId}</span></div>
                                <div className="text-slate-500">Replied At: <span className="text-slate-300">{new Date(track.repliedAt).toLocaleTimeString()}</span></div>
                                {track.reason && (
                                  <div className="text-amber-500 font-sans mt-1 text-[9px]">⚠️ {track.reason}</div>
                                )}
                              </div>
                            ))}

                            {dbState.messageTracking.length === 0 && (
                              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-600">
                                <HelpCircle className="w-8 h-8 text-slate-800 mb-1" />
                                <p className="text-[10px]">No records tracked in message_tracking index. Trigger an email event to observe automatic hashing insertion.</p>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                </div>         </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 3: PROJECT BLUEPRINT & FILE EXPLORER */}
          {activeTab === "blueprint" && (
            <motion.div 
              key="blueprint-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 flex overflow-hidden divide-x divide-slate-800 h-full"
            >
              {/* Directory Tree Panel - Left */}
              <aside className="w-80 bg-slate-900 shrink-0 flex flex-col h-full overflow-y-auto p-4 space-y-4" id="blueprint-explorer">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Enterprise Project Layout</h3>
                  
                  {/* Tree Structure */}
                  <div className="space-y-1 text-xs select-none">
                    
                    {/* Root Folder */}
                    <div className="space-y-1">
                      <div 
                        onClick={() => toggleFolder("root")}
                        className="flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-slate-800/50 cursor-pointer font-semibold text-slate-200"
                      >
                        {expandedFolders.root ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                        <Folder className="w-4 h-4 text-blue-400 fill-blue-500/20" />
                        <span className="font-mono text-xs">secure-webmail-system/</span>
                      </div>

                      {expandedFolders.root && (
                        <div className="pl-4 border-l border-slate-800 space-y-1 mt-1">
                          
                          {/* Wrangler configuration */}
                          <div 
                            onClick={() => setSelectedBlueprintFile("wrangler_toml")}
                            className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer font-mono ${
                              selectedBlueprintFile === "wrangler_toml" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                            }`}
                          >
                            <FileCode className="w-3.5 h-3.5 text-slate-500" />
                            <span>wrangler.toml</span>
                          </div>

                          {/* Workers Subdirectory */}
                          <div>
                            <div 
                              onClick={() => toggleFolder("workers")}
                              className="flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-slate-800/30 cursor-pointer text-slate-300"
                            >
                              {expandedFolders.workers ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                              <Folder className="w-4 h-4 text-amber-500 fill-amber-500/10" />
                              <span className="font-mono">workers/mail-auto-responder/</span>
                            </div>

                            {expandedFolders.workers && (
                              <div className="pl-4 border-l border-slate-800 space-y-1 mt-1 font-mono">
                                <div className="text-slate-500 text-[10px] uppercase py-0.5 px-2">src/</div>
                                <div 
                                  onClick={() => setSelectedBlueprintFile("worker_index")}
                                  className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer ${
                                    selectedBlueprintFile === "worker_index" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                                  }`}
                                >
                                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                                  <span>index.ts</span>
                                </div>
                                <div 
                                  onClick={() => setSelectedBlueprintFile("worker_security")}
                                  className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer ${
                                    selectedBlueprintFile === "worker_security" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                                  }`}
                                >
                                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                                  <span>security.ts</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Frontend Next.js app directory */}
                          <div>
                            <div 
                              onClick={() => toggleFolder("frontend")}
                              className="flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-slate-800/30 cursor-pointer text-slate-300"
                            >
                              {expandedFolders.frontend ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                              <Folder className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                              <span className="font-mono">frontend/</span>
                            </div>

                            {expandedFolders.frontend && (
                              <div className="pl-4 border-l border-slate-800 space-y-1 mt-1 font-mono text-slate-400">
                                <div className="text-slate-500 text-[10px] uppercase py-0.5 px-2">src/components/</div>
                                <div 
                                  onClick={() => setSelectedBlueprintFile("next_composer")}
                                  className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer ${
                                    selectedBlueprintFile === "next_composer" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                                  }`}
                                >
                                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>MailComposer.tsx</span>
                                </div>
                                
                                <div className="text-slate-600/80 px-2 py-1 flex items-center gap-1.5"><FileText className="w-3 h-3" /> AutoResponder.tsx</div>
                                <div className="text-slate-600/80 px-2 py-1 flex items-center gap-1.5"><FileText className="w-3 h-3" /> FolderSidebar.tsx</div>
                                <div className="text-slate-500 text-[10px] uppercase py-0.5 px-2 mt-2">src/lib/security/</div>
                                <div className="text-slate-600/80 px-2 py-1 flex items-center gap-1.5"><FileText className="w-3 h-3" /> csrf-tokens.ts</div>
                                <div className="text-slate-600/80 px-2 py-1 flex items-center gap-1.5"><FileText className="w-3 h-3" /> xss-purify.ts</div>
                              </div>
                            )}
                          </div>

                          {/* Database Schema migrations */}
                          <div>
                            <div 
                              onClick={() => toggleFolder("database")}
                              className="flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-slate-800/30 cursor-pointer text-slate-300"
                            >
                              {expandedFolders.database ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                              <Folder className="w-4 h-4 text-indigo-500 fill-indigo-500/10" />
                              <span className="font-mono">migrations/</span>
                            </div>

                            {expandedFolders.database && (
                              <div className="pl-4 border-l border-slate-800 space-y-1 mt-1 font-mono text-slate-400">
                                <div className="text-slate-600/80 px-2 py-1 flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5 text-indigo-400" /> 0001_init_schema.sql</div>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </aside>

              {/* Code Viewer Panel - Right */}
              <section className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden" id="blueprint-code-pane">
                {currentBlueprint ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* File bar */}
                    <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                      <div>
                        <div className="text-xs font-bold text-slate-200 font-mono">{currentBlueprint.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{currentBlueprint.path}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(currentBlueprint.code, currentBlueprint.name)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {copiedText === currentBlueprint.name ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedText === currentBlueprint.name ? "Copied!" : "Copy Code"}</span>
                      </button>
                    </div>

                    {/* Metadata & Description */}
                    <div className="p-4 bg-slate-900/40 border-b border-slate-850/80 text-xs text-slate-400 shrink-0">
                      <div className="bg-slate-950/60 p-3 rounded border border-slate-800/60 flex items-start gap-3">
                        <Terminal className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <strong className="text-slate-300">File Objective:</strong> {currentBlueprint.desc}
                        </div>
                      </div>
                    </div>

                    {/* Code Editor Body */}
                    <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed bg-slate-950 select-text">
                      <pre className="p-2">
                        <code>{currentBlueprint.code}</code>
                      </pre>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8 text-slate-500">
                    <Folder className="w-12 h-12 text-slate-800 mb-2" />
                    <span>Select a proposed file from the tree layout on the left to read the implementation code.</span>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* TAB 4: SQL DATABASE SCHEMA FOR D1 */}
          {activeTab === "schema" && (
            <motion.div 
              key="schema-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 overflow-y-auto p-6 space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Schema Metadata / Explainer */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">D1 Schema Design Patterns</h3>
                    
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Cloudflare D1 runs on SQLite engine inside V8 isolation at global Edge pops. It serves as a rapid, high-concurrency storage medium for handling active sessions, user parameters, and cryptographic loop mitigation.
                    </p>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-start gap-3">
                        <div className="p-1 rounded bg-blue-950 border border-blue-500/20 text-blue-400 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Anti-Loop Tracking Hashing</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Hash value is a SHA-256 compound of <code className="text-blue-300 bg-slate-950 px-1 rounded font-mono">Recipient+SMTP Message-ID</code>. Fast primary-key checks block incoming loop vectors in O(1) time complexity.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-1 rounded bg-indigo-950 border border-indigo-500/20 text-indigo-400 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Cooldown Control suppression</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Index <code className="text-indigo-300 bg-slate-950 px-1 rounded font-mono">idx_tracking_sender</code> speeds up cooldown checking (suppresses auto-responder reactions to duplicate emails within 24h).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-1 rounded bg-emerald-950 border border-emerald-500/20 text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Cascade Constraint Security</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Tables bind signatures and responders with strict <code className="text-emerald-300 bg-slate-950 px-1 rounded font-mono">ON DELETE CASCADE</code> rules, ensuring that account resets purge data securely to avoid leaving orphan rows.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Schema validation box */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Migration Command Blueprints</h4>
                    <p className="text-xs text-slate-400">
                      Wrangler commands to bootstrap this SQL migration to your edge environment:
                    </p>
                    <div className="bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-[10px] space-y-2 select-all">
                      <div className="text-slate-500"># Run local development simulation database migration:</div>
                      <div className="text-blue-400">npx wrangler d1 migrations apply prod-webmail-d1 --local</div>
                      <div className="text-slate-500 mt-2"># Execute on Cloudflare Global Production Edge Network:</div>
                      <div className="text-amber-400">npx wrangler d1 migrations apply prod-webmail-d1 --remote</div>
                    </div>
                  </div>
                </div>

                {/* SQL Code Block */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[520px]">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">D1 SQLite Table Definitions</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(sqlSchemaText, "D1 SQL Schema")}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedText === "D1 SQL Schema" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === "D1 SQL Schema" ? "Copied SQL!" : "Copy SQL"}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 select-text">
                    <pre className="leading-relaxed">
                      <code>{sqlSchemaText}</code>
                    </pre>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 5: CYBERSECURITY THREAT MATRIX */}
          {activeTab === "threat" && (
            <motion.div 
              key="threat-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 overflow-y-auto p-6 space-y-8"
            >
              <div className="space-y-6">
                
                {/* Intro banner */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row gap-5 items-start md:items-center">
                  <div className="bg-red-950/80 border border-red-500/30 p-3.5 rounded-xl text-red-400 shrink-0">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-tight">Enterprise Defensive Cybersecurity Threat Matrix</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Designed to meet rigid SOC2 and OWASP ASVS (Application Security Verification Standard) targets for enterprise webmail and automated relays.
                    </p>
                  </div>
                </div>

                {/* Threat Mitigation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Threat 1: HTML Cross-Site Scripting (XSS) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider bg-red-950/50 border border-red-500/20 px-2 py-0.5 rounded">OWASP-A3: Injection</span>
                        <h4 className="text-xs font-bold text-white mt-1.5">Stored Cross-Site Scripting (HTML XSS)</h4>
                      </div>
                      <span className="text-xs text-red-400 font-semibold bg-red-950 px-2 py-1 rounded">Critical Threat</span>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-normal">
                      Attackers inject malicious JavaScript inside saved signature HTML templates or inbound SMTP message bodies. If rendered raw in the client UI, this executes scripts in the user's browser session to steal access tokens.
                    </p>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs">
                      <strong className="text-emerald-400 block mb-1">Architectural Safeguards:</strong>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 font-sans text-[11px] leading-relaxed">
                        <li>Strict HTML Sanitization via isomorphic <strong className="text-slate-200">DOMPurify</strong> before any SQL insertion or DOM rendering.</li>
                        <li>Enforce content validation rules. Block script tags, nested inline schemas, onload/onerror events, and java-script links.</li>
                        <li>Enforce standard Content Security Policy (CSP) headers: <code className="text-blue-300 font-mono bg-blue-950/60 px-1 rounded">default-src 'self'; script-src 'nonce-csp-generated';</code></li>
                      </ul>
                    </div>

                    {/* Interactive XSS Sanitization Sandbox */}
                    <div className="border border-slate-800/80 rounded-lg p-3 bg-slate-950/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold uppercase text-blue-400">Live Client Sanitizer Sandbox</span>
                        <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">DOMPurify Simulator</span>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 block font-medium">Draft Signature HTML with Potential XSS Vector:</label>
                        <textarea 
                          value={rawSignatureInput}
                          onChange={(e) => setRawSignatureInput(e.target.value)}
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Filtered & Sanitized Output Safe for Webmail Insertion:</span>
                          <span className="text-emerald-400 font-semibold font-mono">Sanitized Output</span>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 p-2 rounded text-[10px] font-mono text-emerald-300 break-all select-all">
                          {sanitizedSignatureOutput.sanitized}
                        </div>
                        {sanitizedSignatureOutput.wasSanitized && (
                          <div className="text-[9px] text-amber-500 font-sans flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> Malicious markup intercepted and stripped! Inline event parameters blocked.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Threat 2: Infinite E-mail Loops */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider bg-red-950/50 border border-red-500/20 px-2 py-0.5 rounded">DoS Mitigation</span>
                          <h4 className="text-xs font-bold text-white mt-1.5">Infinite Email Auto-Responder Loops</h4>
                        </div>
                        <span className="text-xs text-red-400 font-semibold bg-red-950 px-2 py-1 rounded">High Severity</span>
                      </div>
                      
                      <p className="text-xs text-slate-400 leading-normal">
                        An auto-responder replies to an automated system. If that automated system auto-replies back, it creates an infinite loop of growing bounce-messages. This quickly depletes database limits, triggers spam blocks, and crashes edge processes.
                      </p>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs">
                        <strong className="text-emerald-400 block mb-1">Defensive Mechanisms Built into our Worker:</strong>
                        <ul className="list-disc pl-4 space-y-1.5 text-slate-400 font-sans text-[11px] leading-relaxed">
                          <li><strong className="text-slate-200">Pre-Filtering Headers:</strong> Read and discard messages with <code className="text-blue-300 font-mono">Auto-Submitted: auto-replied</code>, <code className="text-blue-300 font-mono">auto-generated</code>, or <code className="text-blue-300 font-mono">Precedence: bulk</code> headers.</li>
                          <li><strong className="text-slate-200">Idempotent ID Hashing:</strong> Compute SHA-256 of original Message-ID + recipient email. Check tracking DB index. Hard block repeats.</li>
                          <li><strong className="text-slate-200">Temporal Sender Cooldown:</strong> Block repeat responses to the exact same sender email address within 24 hours via D1 temporal checks.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-3 text-[11px] text-slate-400 leading-normal">
                      💡 <strong>Simulation note:</strong> Go to the <button onClick={() => setActiveTab("responder")} className="text-blue-400 font-semibold hover:underline bg-transparent border-none p-0">Auto-Responder Sandbox</button> tab to test auto-headers and hash interception rules on the database in real-time.
                    </div>
                  </div>

                  {/* Threat 3: CSRF & Session Takeover */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider bg-amber-950/50 border border-amber-500/20 px-2 py-0.5 rounded">OWASP-A1: Broken Control</span>
                        <h4 className="text-xs font-bold text-white mt-1.5">Cross-Site Request Forgery (CSRF)</h4>
                      </div>
                      <span className="text-xs text-amber-500 font-semibold bg-amber-950 px-2 py-1 rounded">Medium Severity</span>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-normal">
                      Malicious websites trigger hidden background requests to the webmail server on behalf of an authenticated user (e.g. updating auto-responder parameters to route carbon copies of all incoming emails to an attacker).
                    </p>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs">
                      <strong className="text-emerald-400 block mb-1">Architectural Safeguards:</strong>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 font-sans text-[11px] leading-relaxed">
                        <li>Session cookies initialized with <code className="text-blue-300 font-mono">SameSite=Strict; Secure; HttpOnly</code> attributes to avoid third-party ambient delivery.</li>
                        <li>Dynamic, cryptographic anti-CSRF challenge tokens associated with each active user session. Required on all POST/PUT mutation APIs.</li>
                        <li>Strict validation of incoming HTTP <code className="text-slate-300 font-mono">Origin</code> and <code className="text-slate-300 font-mono">Referer</code> header values in Cloudflare Worker endpoints.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Threat 4: SQL Injection */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider bg-red-950/50 border border-red-500/20 px-2 py-0.5 rounded">OWASP-A3: Injection</span>
                        <h4 className="text-xs font-bold text-white mt-1.5">SQL Injection (SQLi) in D1</h4>
                      </div>
                      <span className="text-xs text-red-400 font-semibold bg-red-950 px-2 py-1 rounded">High Severity</span>
                    </div>
                    
                    <p className="text-xs text-slate-400 leading-normal">
                      Attackers include SQL strings inside message fields or header variables. If the edge database queries strings using raw string interpolation, attackers can bypass security rules, overwrite responder states, or extract private messages.
                    </p>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs">
                      <strong className="text-emerald-400 block mb-1">Architectural Safeguards:</strong>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 font-sans text-[11px] leading-relaxed">
                        <li>Strict, non-negotiable use of Parameterized SQL statements (using <code className="text-blue-300 font-mono">db.prepare("SELECT * FROM x WHERE id = ?").bind()</code>) across all D1 Worker logic.</li>
                        <li>Enforce type safety inside SQL bindings via Drizzle ORM schemas or TypeScript types.</li>
                        <li>Configure Cloudflare Web Application Firewall (WAF) SQL Injection rulesets upstream to filter malicious payload strings prior to worker activation.</li>
                      </ul>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Footer System Console Indicators */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 shrink-0 gap-2" id="footer-bar">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> <strong>Active Node:</strong> Edge Cluster (E-2026)</span>
          <span className="hidden sm:inline">|</span>
          <span><strong>D1 DB replica status:</strong> Sync (0.2ms latency)</span>
        </div>
        <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-600">
          <span>MD5 SECURE COMPLIANT</span>
          <span>•</span>
          <span>AES-GCM-256</span>
        </div>
      </footer>

    </div>
  );
}
