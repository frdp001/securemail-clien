# Edge Mail Client & Anti-Loop Email Auto-Responder

A production-ready, highly secure webmail interface and edge auto-responder pipeline built on **React (Vite) + Tailwind CSS** for the frontend, and powered by **Cloudflare Workers** with **Cloudflare D1 (SQLite)** at the edge. 

This repository contains both the client administration control panel and the edge runtime code designed to handle high-velocity incoming SMTP traffic, execute anti-loop/bounce prevention logic, and parse dynamic response templates.

---

## 🚀 Deployment & Installation Architecture

```
                       ┌────────────────────────┐
                       │  Inbound SMTP Email    │
                       └───────────┬────────────┘
                                   │ (Cloudflare Email Routing)
                                   ▼
                      ┌──────────────────────────┐
                      │    Cloudflare Worker     │
                      │ (Auto-Responder Pipeline)│
                      └─────┬──────────────┬─────┘
                            │              │
                    (Read / Write)   (Send Response)
                            │              │
                            ▼              ▼
                    ┌────────────┐   ┌────────────┐
                    │  Cloudflare│   │ SendGrid / │
                    │ D1 Database│   │ Mailgun API│
                    └────────────┘   └────────────┘
                            ▲
                            │ (HTTPS Admin APIs)
                            │
                    ┌────────────┐
                    │ React/Vite │
                    │ Control Panel
                    └────────────┘
```

---

## Part 1: Frontend Client Deployment

The control panel enables administrators to manage template configurations, design rich HTML templates utilizing a secure **TipTap WYSIWYG Editor**, manage pre-sanitized SMTP signatures, and audit real-time anti-loop transaction logs.

### 1. Local Development Setup
First, ensure you have Node.js (v18+) installed.

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```
The React development server binds to `http://localhost:3000`.

### 2. Compile for Production
```bash
# Build static assets
npm run build
```
This outputs production-ready optimized static HTML, CSS, and JS files into the `dist/` directory.

### 3. Deploying the Frontend
You can host the generated `dist/` folder on any static provider. We recommend **Cloudflare Pages** for native integration:
1. Push your code to GitHub.
2. Go to the **Cloudflare Dashboard** > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Configure the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Click **Save and Deploy**.

---

## Part 2: Cloudflare D1 Database Provisioning

**Cloudflare D1** is a serverless SQLite-based SQL database designed for low-latency queries at the edge. The worker queries D1 to fetch active configurations, validate signature structures, and track SMTP transaction hashes.

### 1. Create a D1 Database via Wrangler CLI
Install Wrangler globally or run via `npx`:

```bash
# Log in to your Cloudflare account
npx wrangler login

# Create the database
npx wrangler d1 create auto-responder-db
```
This command outputs your new database's unique ID (`database_id`).

### 2. Execute SQL Schema Initialization
Execute the following DDL statements to set up the relational tables. Create a file named `schema.sql` and run it against your D1 instance:

```sql
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
CREATE INDEX IF NOT EXISTS idx_tracking_replied_at ON message_tracking(replied_at);
```

To execute the script on the live D1 instance:
```bash
npx wrangler d1 execute auto-responder-db --file=./schema.sql --remote
```

---

## Part 3: Cloudflare Worker Setup

The Cloudflare Worker interceptor is situated directly on the email receiving stream. It handles parsing inbound messages, evaluating anti-loop parameters, substituting dynamic HTML template placeholders, sanitizing content, and triggering the final outbound reply envelope.

### 1. Worker Directory Structure
Ensure your Worker project directory `/workers/mail-auto-responder` is configured as follows:

```
/workers/mail-auto-responder/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── src/
    └── index.ts
```

### 2. Create the Configuration (`wrangler.toml`)
Create a `wrangler.toml` file in `/workers/mail-auto-responder/` to bind D1 and configure parameters:

```toml
name = "mail-auto-responder"
main = "src/index.ts"
compatibility_date = "2024-03-01"

[vars]
COOLDOWN_WINDOW_SECONDS = "86400" # 24 Hours default suppression window per sender

[[d1_databases]]
binding = "DB" # Exposes env.DB to your Worker
database_name = "auto-responder-db"
database_id = "YOUR_D1_DATABASE_ID_FROM_STEP_2"
```

### 3. Deploy the Worker
From inside your `/workers/mail-auto-responder` directory, trigger wrangler deployment:

```bash
# Publish code live to your Cloudflare network
npx wrangler deploy
```

---

## Part 4: Connecting Cloudflare Email Routing

To run the Worker automatically when a mail lands on your custom domain:

1. Navigate to **Cloudflare Dashboard** > **[Select Your Domain]** > **Email Routing**.
2. Go to **Active Destinations** and verify the external destination address if forwarding elsewhere, or configure **Email Routing Route Rules**.
3. Click **Routing Rules** > **Create Rule**:
   - **Custom Address**: E.g., `support@yourdomain.com` or `info@yourdomain.com` (this matches the `recipient` email).
   - **Action**: Select **Send to Worker**.
   - **Destination Worker**: Choose `mail-auto-responder`.
4. Click **Save**.

Now, all incoming SMTP envelopes targeted to that address will be forwarded as events to your Worker's `email()` lifecycle hook.

---

## 🔒 Security & Anti-Loop Deep-Dive

The edge pipeline features a robust Multi-Tier Anti-Loop Prevention system designed to suppress recursive bounce cascades and infinite auto-reply storms:

### 1. Dynamic Placeholder Parsing
The worker intercepts and dynamically substitutes the following 7 registered templates during rendering:
- `{{sender_name}}` – The display/human name of the original inbound sender.
- `{{sender_email}}` – Stripped and sanitized address of the incoming sender.
- `{{recipient_name}}` – The name of your auto-responder inbound inbox.
- `{{subject}}` – The original email subject header.
- `{{date}}` – The RFC 5322 formatted Date of the original arrival.
- `{{message_id}}` – The original SMTP `Message-ID` used for loop detection.
- `{{thread_id}}` – Derived conversation identifier used to block multi-replies inside the same thread.

### 2. Multi-Tier Suppression Matrix
- **Header Check**: Blocks emails containing automated auto-reply headers:
  - `Auto-Submitted` (values: `auto-replied`, `auto-generated`)
  - `Precedence` (values: `bulk`, `list`)
- **Strict Cryptographic Hashing**: Hashes `(recipient_email + Message-ID)`. If this hash exists in the `message_tracking` table, the execution is immediately aborted because the specific inbound message was already replied to.
- **Conversation Thread Suppression**: Tracks `thread_id` (the first reference identifier parsed from `References` or falling back to `Message-ID`). If the conversation thread ID has already received a status of `replied`, the auto-responder terminates.
- **Velocity Cooldown Window**: Looks up the last `replied` log for the sender. If the sender received an auto-reply within `COOLDOWN_WINDOW_SECONDS` (default 24h), it intercepts, commits a `blocked_cooldown` row to D1, and halts.
- **Deep HTML Sanitizer**: Outbound templates are passed through an active sanitizer that strips JavaScript event hooks (e.g. `onload`, `onerror`), script blocks, iframes, active protocols (`javascript:`), and stylesheets capable of UI redressing.
