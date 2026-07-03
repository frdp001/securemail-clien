/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo, 
  Braces, 
  Sparkles, 
  Lock, 
  ChevronDown, 
  Info, 
  Check, 
  Signature, 
  Send 
} from "lucide-react";
import { sanitizeHtml } from "../sanitizer";
import { PLACEHOLDER_REGISTRY } from "../types/index";

interface MailComposerProps {
  onSend: (data: { to: string; subject: string; bodyHtml: string }) => void;
  signatures: Array<{ signatureId: string; name: string; htmlContent: string }>;
  defaultSignatureId?: string;
}

export default function MailComposer({ onSend, signatures, defaultSignatureId }: MailComposerProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedSignatureId, setSelectedSignatureId] = useState(defaultSignatureId || "");
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);

  // Define supported placeholders from registry
  const placeholders = Object.values(PLACEHOLDER_REGISTRY);

  // Initialize TipTap Headless Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: `
      <p>Thank you for reaching out to our Operations Center.</p>
      <p>This is an automated response to confirm we received your mail concerning <strong>{{subject}}</strong>. We will investigate the query and respond shortly.</p>
      <p>Best regards,</p>
    `,
    editorProps: {
      attributes: {
        class: "prose prose-sm prose-invert focus:outline-none min-h-[250px] max-h-[400px] overflow-y-auto px-4 py-3 text-slate-100 bg-slate-900 border border-slate-800 rounded-b-lg text-sm leading-relaxed",
      },
    },
  });

  // Inject placeholder text at current cursor selection
  const handleInsertPlaceholder = (placeholder: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(placeholder).run();
    setShowPlaceholders(false);
  };

  // Submit and sanitize auto-responder body templates
  const handleCompileAndSend = () => {
    if (!editor) return;
    const rawContent = editor.getHTML();
    
    // Lookup selected signature
    const signatureObj = signatures.find(s => s.signatureId === selectedSignatureId);
    const signatureHtml = signatureObj ? signatureObj.htmlContent : "";

    // Append signature block securely
    const combinedHtml = `
      <div class="webmail-body-content">
        ${rawContent}
      </div>
      ${signatureHtml ? `<div class="webmail-appended-signature" style="margin-top: 24px; border-top: 1px solid #334155; padding-top: 12px; font-size: 13px; color: #94a3b8;">${signatureHtml}</div>` : ""}
    `;

    // Strict sanitization via DOMPurify before storage or relay transmission
    const pristineSanitizedHtml = sanitizeHtml(combinedHtml);

    onSend({
      to,
      subject,
      bodyHtml: pristineSanitizedHtml
    });
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg" id="mail-composer-root">
      
      {/* Target Address and Subject Panels */}
      <div className="p-4 bg-slate-900/40 border-b border-slate-800 space-y-3">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-mono text-slate-500 w-16">TO:</label>
          <input 
            type="email" 
            placeholder="Recipient pattern or wildcard (e.g., *@yourdomain.com)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-600 font-mono"
          />
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-xs font-mono text-slate-500 w-16">SUBJECT:</label>
          <input 
            type="text" 
            placeholder="Auto-response prefix subject (e.g., Auto-Reply: )"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-600 font-medium"
          />
        </div>
      </div>

      {/* TipTap Rich Text Toolbar */}
      {editor && (
        <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-slate-900 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive("bold") ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
              title="Bold"
              type="button"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive("italic") ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
              title="Italic"
              type="button"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-slate-800 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive("bulletList") ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
              title="Bullet List"
              type="button"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive("orderedList") ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
              title="Numbered List"
              type="button"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive("blockquote") ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
              title="Quote"
              type="button"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive("codeBlock") ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
              title="Code Block"
              type="button"
            >
              <Braces className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-slate-800 mx-1" />
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Undo"
              type="button"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Redo"
              type="button"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Placeholders Dynamic Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPlaceholders(!showPlaceholders);
                setShowSignatures(false);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-blue-400 border border-blue-500/20 shadow-sm"
              type="button"
              id="placeholder-dropdown-btn"
            >
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>Insert Placeholders</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showPlaceholders && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 p-2 divide-y divide-slate-800">
                <div className="p-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Auto-Responder Safe Hooks
                </div>
                <div className="py-1">
                  {placeholders.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => handleInsertPlaceholder(p.key)}
                      className="w-full text-left p-2 hover:bg-slate-900 rounded transition-colors text-xs flex flex-col space-y-0.5"
                      type="button"
                    >
                      <span className="font-mono text-blue-400 font-bold">{p.key}</span>
                      <span className="text-slate-300 text-[11px] font-semibold">{p.label}</span>
                      <span className="text-slate-500 text-[10px]">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Main Content Area */}
      <div className="flex-1 bg-slate-900/25">
        <EditorContent editor={editor} />
      </div>

      {/* Composer Footer (Signature Selector & Sanitized Send Action) */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Dynamic Signature Association Controls */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Signature className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="relative flex-1 md:flex-none">
            <button
              onClick={() => {
                setShowSignatures(!showSignatures);
                setShowPlaceholders(false);
              }}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 w-full min-w-[180px]"
              type="button"
              id="signature-dropdown-btn"
            >
              <span>
                {signatures.find(s => s.signatureId === selectedSignatureId)?.name || "No Signature Selected"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSignatures && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 p-1.5">
                <button
                  onClick={() => {
                    setSelectedSignatureId("");
                    setShowSignatures(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded text-slate-400 hover:bg-slate-900 hover:text-white"
                  type="button"
                >
                  None (Plain)
                </button>
                {signatures.map((sig) => (
                  <button
                    key={sig.signatureId}
                    onClick={() => {
                      setSelectedSignatureId(sig.signatureId);
                      setShowSignatures(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded text-slate-200 hover:bg-slate-900 flex items-center justify-between"
                    type="button"
                  >
                    <span>{sig.name}</span>
                    {selectedSignatureId === sig.signatureId && <Check className="w-3 h-3 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Lock className="w-3 h-3 text-emerald-500" />
            <span>Pristine XSS Filtered</span>
          </div>
          <button
            onClick={handleCompileAndSend}
            disabled={!to || !subject}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
            id="composer-send-btn"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compile & Save Configuration</span>
          </button>
        </div>

      </div>

    </div>
  );
}
