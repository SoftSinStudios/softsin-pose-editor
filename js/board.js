import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pnpijueflzvlyzzmhdwa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ts2QrwDwmmIrXbSzG14fBQ_REyHdGS5";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const signedOutBox = document.getElementById("signedOutBox");
const signedInBox = document.getElementById("signedInBox");
const loginDiscord = document.getElementById("loginDiscord");
const logout = document.getElementById("logout");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const composerTitle = document.getElementById("composerTitle");
const composerText = document.getElementById("composerText");
const composerStatus = document.getElementById("composerStatus");
const postMessage = document.getElementById("postMessage");
const newTopicTop = document.getElementById("newTopicTop");
const categoryList = document.getElementById("categoryList");
const boardTitle = document.getElementById("boardTitle");
const boardSubtitle = document.getElementById("boardSubtitle");
const threadList = document.getElementById("threadList");
const searchInput = document.querySelector(".search");
const composer = document.getElementById("composer");
const rulesLink = document.getElementById("rulesLink");
const rulesReminder = document.getElementById("rulesReminder");
const openRulesReminder = document.getElementById("openRulesReminder");
const editorButtons = Array.from(document.querySelectorAll("[data-editor-action]"));
const editorPreviewToggle = document.getElementById("editorPreviewToggle");
const editorPreview = document.getElementById("editorPreview");
const editorCharCount = document.getElementById("editorCharCount");
const onlineNowCount = document.getElementById("onlineNowCount");
const newestMemberName = document.getElementById("newestMemberName");
const threadTotalCount = document.getElementById("threadTotalCount");
const postTotalCount = document.getElementById("postTotalCount");

const READ_THREADS_KEY = "softsin_read_threads_v1";

let currentUser = null;
let currentProfile = null;
let currentCategory = null;
let currentThread = null;
let categoriesBySlug = new Map();
let threadsById = new Map();
let loadedThreads = [];
let currentSearchTerm = "";
let currentBoardView = "threads";
let currentCategories = [];
let editorPreviewMode = false;
let loadedPosts = [];
let editingThreadId = null;
let editingReplyId = null;
let boardPresenceChannel = null;
let boardPresenceUserKey = null;

const fallbackCategories = [
  { id: null, name: "General", slug: "general", description: "Public discussion for the SoftSin Studios ecosystem." },
  { id: null, name: "Pose Editor", slug: "pose-editor", description: "Discussion, support, and feedback for the SoftSin Pose Editor." },
  { id: null, name: "Release Notes", slug: "release-notes", description: "Official updates, releases, and version notes." },
  { id: null, name: "JSON Maker", slug: "json-maker", description: "Discussion and support for the SoftSin JSON Maker." },
  { id: null, name: "ComfyUI Nodes", slug: "comfyui-nodes", description: "SoftSin ComfyUI node support, workflows, and updates." },
  { id: null, name: "SD Prompt Composer", slug: "sd-prompt-composer", description: "Discussion, support, and feedback for the SoftSin SD Prompt Composer." },
  { id: null, name: "Showcase", slug: "showcase", description: "User creations, experiments, and workflow results." },
  { id: null, name: "Known Issues", slug: "known-issues", description: "Known bugs, temporary problems, and confirmed site/tool issues." },
  { id: null, name: "Roadmap", slug: "roadmap", description: "Planned SoftSin updates, tool direction, and future development notes." },
  { id: null, name: "Support Issues", slug: "support-issues", description: "Support requests, setup trouble, and user-reported problems." }
];

const boardRules = [
  {
    title: "Keep posts tied to SoftSin tools and workflows",
    body: "Use the board for SoftSin tools, release notes, ComfyUI workflows, prompt systems, support issues, showcases, and related creator-tool discussion. Off-topic noise may be removed."
  },
  {
    title: "No harassment, stalking, or targeted abuse",
    body: "Criticism is fine. Personal attacks, dogpiling, threats, doxxing, or attempts to drag outside drama into the board are not. Keep the blade on the work, not the person."
  },
  {
    title: "No illegal, exploitative, or non-consensual content",
    body: "Do not post requests, prompts, examples, links, or workflows involving illegal sexual content, sexualized minors, non-consensual sexual material, identity abuse, or evasion of platform rules."
  },
  {
    title: "Support posts need useful detail",
    body: "When asking for help, include the tool name, browser or app version, steps to reproduce, screenshots if useful, console errors, and what you expected to happen. Vague bug reports go straight into the fog machine."
  },
  {
    title: "Showcase posts should be labeled honestly",
    body: "If you share AI-assisted work, be clear about the tool or workflow when it matters. Do not claim another creator’s work as your own."
  },
  {
    title: "Moderation is practical, not theatrical",
    body: "Posts may be pinned, locked, edited, or soft-deleted to keep the board useful. Admin/mod decisions are aimed at keeping the workspace clean and functional."
  }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getReadThreadIds() {
  try {
    const raw = localStorage.getItem(READ_THREADS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.filter(Boolean));
  } catch {
    return new Set();
  }
}

function saveReadThreadIds(ids) {
  try {
    localStorage.setItem(READ_THREADS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage can fail in private modes. Ignore it.
  }
}

function isThreadNew(threadId) {
  if (!threadId) return false;
  return !getReadThreadIds().has(String(threadId));
}

function markThreadRead(threadId) {
  if (!threadId) return;

  const ids = getReadThreadIds();
  ids.add(String(threadId));
  saveReadThreadIds(ids);
}

function renderInlineNew(threadId) {
  if (!isThreadNew(threadId)) return "";
  return ` - <span class="inline-new">NEW</span>`;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
}

function formatDateOnly(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric"
  });
}

function isEdited(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return false;

  const created = new Date(createdAt);
  const updated = new Date(updatedAt);

  if (Number.isNaN(created.getTime()) || Number.isNaN(updated.getTime())) return false;

  return Math.abs(updated - created) > 60000;
}

function formatActivityLabel(createdAt, updatedAt) {
  if (isEdited(createdAt, updatedAt)) {
    return `Updated ${formatDate(updatedAt)}`;
  }

  return `Created ${formatDate(createdAt)}`;
}

function renderInlineEdited(createdAt, updatedAt) {
  if (!isEdited(createdAt, updatedAt)) return "";

  return ` - <span class="inline-edited">Edited - ${escapeHtml(formatDateOnly(updatedAt))}</span>`;
}

function renderEditedTag(createdAt, updatedAt) {
  if (!isEdited(createdAt, updatedAt)) return "";

  return `<span class="tag edit">Edited - ${escapeHtml(formatDateOnly(updatedAt))}</span>`;
}

function formatInlineMarkdown(text) {
  let safe = escapeHtml(text);

  safe = safe.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g,
    (match, alt, url) => {
      const safeAlt = alt || "Posted image";
      return `<a class="markdown-image-link" href="${url}" target="_blank" rel="noopener noreferrer"><img class="markdown-image" src="${url}" alt="${safeAlt}" loading="lazy" referrerpolicy="no-referrer" /></a>`;
    }
  );

  safe = safe.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
  safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  return safe;
}

function renderMarkdownLite(raw) {
  const lines = String(raw || "").replaceAll("\r\n", "\n").split("\n");
  const html = [];
  let listType = null;

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      return;
    }

    if (/^(---|\*\*\*|___|<hr\s*\/?\s*>)$/i.test(trimmed)) {
      closeList();
      html.push('<hr class="markdown-divider" />');
      return;
    }

    if (trimmed.startsWith("> ")) {
      closeList();
      html.push(`<div class="markdown-quote">${formatInlineMarkdown(trimmed.slice(2))}</div>`);
      return;
    }

    if (trimmed.startsWith("- ")) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }

      html.push(`<li>${formatInlineMarkdown(trimmed.slice(2))}</li>`);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (orderedMatch) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }

      html.push(`<li>${formatInlineMarkdown(orderedMatch[1])}</li>`);
      return;
    }

    closeList();
    html.push(`<p>${formatInlineMarkdown(line)}</p>`);
  });

  closeList();

  return html.join("");
}

function stripMarkdownForPreview(raw) {
  return String(raw || "")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, "")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s]*)?$/g, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*(---|\*\*\*|___|<hr\s*\/?\s*>)\s*$/gim, " ")
    .replace(/^>\s+/gm, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function userIsAdmin() {
  return currentProfile?.role === "admin";
}

function userCanUseMediaTools() {
  return userIsAdmin();
}

function textContainsBlockedLinks(value) {
  const text = String(value || "");

  return /https?:\/\//i.test(text)
    || /\bwww\./i.test(text)
    || /!\[[^\]]*\]\([^)]+\)/i.test(text)
    || /\.(com|net|org|io|dev|app|ai|co|us|uk|ca|de|jp|fr|au|gg|tv|me|ru|cn|in|cc|to|su|tk|ml|ga|cf|gq|work|quest|rest|one|info|biz|xyz|site|online|store|cloud|tech|studio|art|zip|mov|link|click|live|space|top|shop|blog|news|media|email|es|id|br|pl|ro|ir|vn|pk|ng|tr|ua|kz|by|lt|pw|ws|icu|cyou|sbs|bond|cam|monster|lol|mom|beauty|hair|skin|autos|boats|homes|loan|loans|men|date|faith|review|reviews|stream|download|win|bid|party|trade|racing|science|accountants|cricket|xin|cfd|buzz|world|mobi|qpon|pics|help|support|finance|vip|pro|today|li|poker|fit|lat|ink|best)(\/|\b)/i.test(text);
}

function validateUserTextPermissions(...values) {
  if (userCanUseMediaTools()) {
    return true;
  }

  const hasBlockedLinks = values.some((value) => textContainsBlockedLinks(value));

  if (hasBlockedLinks) {
    composerStatus.textContent = "Links and images are admin-only. Remove URLs before posting.";
    return false;
  }

  return true;
}

function updateComposerHelperText() {
  if (!composerStatus) return;

  if (!currentUser) {
    composerStatus.textContent = currentThread
      ? "Read freely. Sign in to reply."
      : "Read freely. Sign in to post or reply.";
    return;
  }

  if (userCanUseMediaTools()) {
    composerStatus.textContent = currentThread
      ? "Admin editor: Markdown, links, and image URLs are enabled."
      : "Admin editor: Markdown, links, and image URLs are enabled.";
    return;
  }

  composerStatus.textContent = currentThread
    ? "Basic formatting is enabled. Links and images are admin-only."
    : "Basic formatting is enabled. Links and images are admin-only.";
}

function updateToolbarForRole() {
  const allowMedia = userCanUseMediaTools();

  document.querySelectorAll('[data-editor-action="link"], [data-editor-action="image"]').forEach((button) => {
    button.hidden = !allowMedia;
    button.disabled = !allowMedia || Boolean(composerText?.disabled);
  });

  document.querySelectorAll('[data-mini-editor-action="link"], [data-mini-editor-action="image"]').forEach((button) => {
    button.hidden = !allowMedia;
    button.disabled = !allowMedia;
  });
}

function updateCharCount() {
  if (!editorCharCount || !composerText) return;
  editorCharCount.textContent = `${composerText.value.length} / 20000`;
}

function setEditorDisabled(disabled) {
  editorButtons.forEach((button) => {
    const action = button.dataset.editorAction;
    const isMediaTool = action === "link" || action === "image";

    button.disabled = disabled || (isMediaTool && !userCanUseMediaTools());
    button.hidden = isMediaTool && !userCanUseMediaTools();
  });

  if (editorPreviewToggle) {
    editorPreviewToggle.disabled = disabled;
  }

  if (disabled) {
    setEditorPreviewMode(false);
  }
}

function syncEditorPreview() {
  if (!editorPreview) return;
  editorPreview.innerHTML = renderMarkdownLite(composerText.value);
}

function setEditorPreviewMode(enabled) {
  editorPreviewMode = Boolean(enabled);

  if (composerText) {
    composerText.hidden = editorPreviewMode;
  }

  if (editorPreview) {
    editorPreview.hidden = !editorPreviewMode;
  }

  if (editorPreviewToggle) {
    editorPreviewToggle.classList.toggle("active", editorPreviewMode);
    editorPreviewToggle.textContent = editorPreviewMode ? "Edit" : "Preview";
  }

  if (editorPreviewMode) {
    syncEditorPreview();
  }
}

function replaceSelection(before, after = before, placeholder = "text") {
  if (!composerText || composerText.disabled) return;

  setEditorPreviewMode(false);

  const start = composerText.selectionStart;
  const end = composerText.selectionEnd;
  const value = composerText.value;
  const selected = value.slice(start, end) || placeholder;
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;

  composerText.value = next;
  composerText.focus();

  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;

  composerText.setSelectionRange(cursorStart, cursorEnd);
  updateCharCount();
}

function prefixSelectedLines(prefix) {
  if (!composerText || composerText.disabled) return;

  setEditorPreviewMode(false);

  const start = composerText.selectionStart;
  const end = composerText.selectionEnd;
  const value = composerText.value;
  const selected = value.slice(start, end) || "text";
  const lines = selected.split("\n");
  const nextSelected = lines.map((line) => `${prefix}${line}`).join("\n");
  const next = `${value.slice(0, start)}${nextSelected}${value.slice(end)}`;

  composerText.value = next;
  composerText.focus();
  composerText.setSelectionRange(start, start + nextSelected.length);
  updateCharCount();
}

function numberedSelectedLines() {
  if (!composerText || composerText.disabled) return;

  setEditorPreviewMode(false);

  const start = composerText.selectionStart;
  const end = composerText.selectionEnd;
  const value = composerText.value;
  const selected = value.slice(start, end) || "text";
  const lines = selected.split("\n");
  const nextSelected = lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
  const next = `${value.slice(0, start)}${nextSelected}${value.slice(end)}`;

  composerText.value = next;
  composerText.focus();
  composerText.setSelectionRange(start, start + nextSelected.length);
  updateCharCount();
}

function insertDivider() {
  if (!composerText || composerText.disabled) return;

  setEditorPreviewMode(false);

  const start = composerText.selectionStart;
  const end = composerText.selectionEnd;
  const value = composerText.value;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n" : "";
  const suffix = after && !after.startsWith("\n") ? "\n" : "";
  const divider = `${prefix}---${suffix}`;
  const next = `${before}${divider}${after}`;
  const cursor = before.length + divider.length;

  composerText.value = next;
  composerText.focus();
  composerText.setSelectionRange(cursor, cursor);
  updateCharCount();
}

function insertLink() {
  if (!composerText || composerText.disabled || !userCanUseMediaTools()) return;

  setEditorPreviewMode(false);

  const start = composerText.selectionStart;
  const end = composerText.selectionEnd;
  const value = composerText.value;
  const selected = value.slice(start, end) || "link text";
  const nextSelected = `[${selected}](https://example.com)`;
  const next = `${value.slice(0, start)}${nextSelected}${value.slice(end)}`;

  composerText.value = next;
  composerText.focus();
  composerText.setSelectionRange(start + 1, start + 1 + selected.length);
  updateCharCount();
}

function insertImage() {
  if (!composerText || composerText.disabled || !userCanUseMediaTools()) return;

  setEditorPreviewMode(false);

  const start = composerText.selectionStart;
  const end = composerText.selectionEnd;
  const value = composerText.value;
  const selected = value.slice(start, end) || "image description";
  const nextSelected = `![${selected}](https://example.com/image.jpg)`;
  const next = `${value.slice(0, start)}${nextSelected}${value.slice(end)}`;

  composerText.value = next;
  composerText.focus();
  composerText.setSelectionRange(start + 2, start + 2 + selected.length);
  updateCharCount();
}

function applyEditorAction(action) {
  switch (action) {
    case "bold":
      replaceSelection("**", "**", "bold text");
      break;
    case "italic":
      replaceSelection("*", "*", "italic text");
      break;
    case "code":
      replaceSelection("`", "`", "code");
      break;
    case "quote":
      prefixSelectedLines("> ");
      break;
    case "ul":
      prefixSelectedLines("- ");
      break;
    case "ol":
      numberedSelectedLines();
      break;
    case "divider":
      insertDivider();
      break;
    case "link":
      insertLink();
      break;
    case "image":
      insertImage();
      break;
    default:
      break;
  }
}

function renderMiniEditor(editorId, value = "") {
  const mediaTools = userCanUseMediaTools()
    ? `
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="link">Link</button>
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="image">Image</button>
    `
    : "";

  return `
    <div class="editor-toolbar mini-editor-toolbar" data-mini-editor-toolbar="${escapeHtml(editorId)}" aria-label="Text editor toolbar">
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="bold"><strong>B</strong></button>
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="italic"><em>I</em></button>
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="code">Code</button>
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="quote">Quote</button>
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="ul">• List</button>
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="ol">1. List</button>
      <button class="editor-tool" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="divider">Divider</button>
      ${mediaTools}
      <button class="editor-tool mini-preview-toggle" type="button" data-mini-editor-id="${escapeHtml(editorId)}" data-mini-editor-action="preview">Preview</button>
      <span class="editor-count mini-editor-count" id="${escapeHtml(editorId)}Count">${String(value || "").length} / 20000</span>
    </div>
    <textarea class="edit-textarea mini-editor-textarea" id="${escapeHtml(editorId)}" maxlength="20000">${escapeHtml(value)}</textarea>
    <div class="editor-preview markdown-body mini-editor-preview" id="${escapeHtml(editorId)}Preview" hidden></div>
  `;
}

function getMiniEditorElements(editorId) {
  const textarea = document.getElementById(editorId);
  const preview = document.getElementById(`${editorId}Preview`);
  const count = document.getElementById(`${editorId}Count`);
  const toggle = document.querySelector(`[data-mini-editor-id="${CSS.escape(editorId)}"][data-mini-editor-action="preview"]`);

  return { textarea, preview, count, toggle };
}

function updateMiniEditorCount(editorId) {
  const { textarea, count } = getMiniEditorElements(editorId);

  if (!textarea || !count) return;

  count.textContent = `${textarea.value.length} / 20000`;
}

function resizeMiniEditorTextarea(editorId) {
  const { textarea } = getMiniEditorElements(editorId);

  if (!textarea) return;

  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 160)}px`;
}

function syncMiniEditorPreview(editorId) {
  const { textarea, preview } = getMiniEditorElements(editorId);

  if (!textarea || !preview) return;

  preview.innerHTML = renderMarkdownLite(textarea.value);
}

function setMiniEditorPreviewMode(editorId, enabled) {
  const { textarea, preview, toggle } = getMiniEditorElements(editorId);

  if (!textarea || !preview || !toggle) return;

  textarea.hidden = Boolean(enabled);
  preview.hidden = !enabled;
  toggle.classList.toggle("active", Boolean(enabled));
  toggle.textContent = enabled ? "Edit" : "Preview";

  if (enabled) {
    syncMiniEditorPreview(editorId);
  }
}

function miniReplaceSelection(editorId, before, after = before, placeholder = "text") {
  const { textarea } = getMiniEditorElements(editorId);

  if (!textarea || textarea.disabled) return;

  setMiniEditorPreviewMode(editorId, false);

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;

  textarea.value = next;
  textarea.focus();

  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;

  textarea.setSelectionRange(cursorStart, cursorEnd);
  updateMiniEditorCount(editorId);
}

function miniPrefixSelectedLines(editorId, prefix) {
  const { textarea } = getMiniEditorElements(editorId);

  if (!textarea || textarea.disabled) return;

  setMiniEditorPreviewMode(editorId, false);

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || "text";
  const lines = selected.split("\n");
  const nextSelected = lines.map((line) => `${prefix}${line}`).join("\n");
  const next = `${value.slice(0, start)}${nextSelected}${value.slice(end)}`;

  textarea.value = next;
  textarea.focus();
  textarea.setSelectionRange(start, start + nextSelected.length);
  updateMiniEditorCount(editorId);
}

function miniNumberedSelectedLines(editorId) {
  const { textarea } = getMiniEditorElements(editorId);

  if (!textarea || textarea.disabled) return;

  setMiniEditorPreviewMode(editorId, false);

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || "text";
  const lines = selected.split("\n");
  const nextSelected = lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
  const next = `${value.slice(0, start)}${nextSelected}${value.slice(end)}`;

  textarea.value = next;
  textarea.focus();
  textarea.setSelectionRange(start, start + nextSelected.length);
  updateMiniEditorCount(editorId);
}

function miniInsertDivider(editorId) {
  const { textarea } = getMiniEditorElements(editorId);

  if (!textarea || textarea.disabled) return;

  setMiniEditorPreviewMode(editorId, false);

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n" : "";
  const suffix = after && !after.startsWith("\n") ? "\n" : "";
  const divider = `${prefix}---${suffix}`;
  const next = `${before}${divider}${after}`;
  const cursor = before.length + divider.length;

  textarea.value = next;
  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);
  updateMiniEditorCount(editorId);
}

function miniInsertLink(editorId) {
  if (!userCanUseMediaTools()) return;

  const { textarea } = getMiniEditorElements(editorId);

  if (!textarea || textarea.disabled) return;

  setMiniEditorPreviewMode(editorId, false);

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || "link text";
  const nextSelected = `[${selected}](https://example.com)`;
  const next = `${value.slice(0, start)}${nextSelected}${value.slice(end)}`;

  textarea.value = next;
  textarea.focus();
  textarea.setSelectionRange(start + 1, start + 1 + selected.length);
  updateMiniEditorCount(editorId);
}

function miniInsertImage(editorId) {
  if (!userCanUseMediaTools()) return;

  const { textarea } = getMiniEditorElements(editorId);

  if (!textarea || textarea.disabled) return;

  setMiniEditorPreviewMode(editorId, false);

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || "image description";
  const nextSelected = `![${selected}](https://example.com/image.jpg)`;
  const next = `${value.slice(0, start)}${nextSelected}${value.slice(end)}`;

  textarea.value = next;
  textarea.focus();
  textarea.setSelectionRange(start + 2, start + 2 + selected.length);
  updateMiniEditorCount(editorId);
}

function applyMiniEditorAction(editorId, action) {
  switch (action) {
    case "bold":
      miniReplaceSelection(editorId, "**", "**", "bold text");
      break;
    case "italic":
      miniReplaceSelection(editorId, "*", "*", "italic text");
      break;
    case "code":
      miniReplaceSelection(editorId, "`", "`", "code");
      break;
    case "quote":
      miniPrefixSelectedLines(editorId, "> ");
      break;
    case "ul":
      miniPrefixSelectedLines(editorId, "- ");
      break;
    case "ol":
      miniNumberedSelectedLines(editorId);
      break;
    case "divider":
      miniInsertDivider(editorId);
      break;
    case "link":
      miniInsertLink(editorId);
      break;
    case "image":
      miniInsertImage(editorId);
      break;
    case "preview": {
      const { textarea } = getMiniEditorElements(editorId);
      if (!textarea) return;
      setMiniEditorPreviewMode(editorId, !textarea.hidden);
      break;
    }
    default:
      break;
  }
}

function attachMiniEditor(editorId) {
  const { textarea } = getMiniEditorElements(editorId);

  if (!textarea) return;

  document.querySelectorAll(`[data-mini-editor-id="${CSS.escape(editorId)}"]`).forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      applyMiniEditorAction(editorId, button.dataset.miniEditorAction);
      resizeMiniEditorTextarea(editorId);
    });
  });

  textarea.addEventListener("input", () => {
    updateMiniEditorCount(editorId);
    resizeMiniEditorTextarea(editorId);

    if (textarea.hidden) {
      syncMiniEditorPreview(editorId);
    }
  });

  updateMiniEditorCount(editorId);
  resizeMiniEditorTextarea(editorId);
  updateToolbarForRole();
}

function getProfileName(profile) {
  return profile?.display_name || profile?.username || "SoftSin member";
}

function getInitials(profile) {
  const name = profile?.display_name || profile?.username || "SS";
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "SS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getDisplayName(user, profile) {
  return (
    profile?.display_name ||
    user?.user_metadata?.global_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "SoftSin member"
  );
}

function getAvatar(user, profile) {
  return (
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    ""
  );
}

function renderAvatar(profile, extraClass = "") {
  const avatarUrl = profile?.avatar_url || "";
  const initials = getInitials(profile);
  const classes = `avatar image-avatar${extraClass ? ` ${extraClass}` : ""}`;

  if (avatarUrl) {
    return `<img class="${classes}" src="${escapeHtml(avatarUrl)}" alt="" />`;
  }

  return `<div class="avatar${extraClass ? ` ${extraClass}` : ""}">${escapeHtml(initials)}</div>`;
}

function isModeratorOrAdmin() {
  return currentProfile?.role === "moderator" || currentProfile?.role === "admin";
}

function canEditThread(thread) {
  if (!currentUser || !thread) return false;
  return isModeratorOrAdmin() || thread.profiles?.id === currentUser.id;
}

function canEditPost(post) {
  if (!currentUser || !post) return false;
  return isModeratorOrAdmin() || post.profiles?.id === currentUser.id;
}

function renderThreadControls(thread) {
  const controls = [];

  if (canEditThread(thread)) {
    controls.push(`<button class="btn admin-button edit-thread-button" id="editThread" type="button">Edit Thread</button>`);
  }

  const adminControls = renderAdminControls(thread);

  if (!controls.length && !adminControls) return "";

  return `
    <div class="admin-controls content-controls">
      ${controls.join(" ")}
      ${adminControls}
    </div>
  `;
}

function renderReplyControls(post) {
  const controls = [];

  if (canEditPost(post)) {
    controls.push(`<button class="btn admin-button edit-reply-button" type="button" data-post-id="${escapeHtml(post.id)}">Edit Reply</button>`);
  }

  if (isModeratorOrAdmin()) {
    controls.push(`<button class="btn red admin-button delete-reply-button" type="button" data-post-id="${escapeHtml(post.id)}">Delete Reply</button>`);
  }

  if (!controls.length) return "";

  return `
    <div class="admin-controls reply-admin-controls">
      ${controls.join(" ")}
    </div>
  `;
}

function renderThreadTags(thread, includeDefault = true, includeEdited = true) {
  const tags = [];

  if (thread.pinned) {
    tags.push(`<span class="tag good">Pinned</span>`);
  }

  if (thread.locked) {
    tags.push(`<span class="tag warn">Locked</span>`);
  }

  if (includeEdited) {
    const editedTag = renderEditedTag(thread.created_at, thread.updated_at);

    if (editedTag) {
      tags.push(editedTag);
    }
  }

  if (includeDefault || tags.length === 0) {
    tags.push(`<span class="tag">Thread</span>`);
  }

  return tags.join(" ");
}

function getFilteredThreads() {
  const term = currentSearchTerm.trim().toLowerCase();

  if (!term) return loadedThreads;

  return loadedThreads.filter((thread) => {
    const title = String(thread.title || "").toLowerCase();
    const body = String(thread.body || "").toLowerCase();
    const author = String(thread.profiles?.display_name || thread.profiles?.username || "").toLowerCase();

    return title.includes(term) || body.includes(term) || author.includes(term);
  });
}

function setComposerVisibility(visible) {
  if (composer) {
    composer.hidden = !visible;
  }

  if (rulesReminder) {
    rulesReminder.hidden = !visible;
  }
}

function setSearchEnabled(enabled) {
  if (!searchInput) return;

  searchInput.disabled = !enabled;

  if (!enabled) {
    searchInput.value = "";
    currentSearchTerm = "";
  }
}

function renderRulesView() {
  editingThreadId = null;
  editingReplyId = null;
  currentBoardView = "rules";
  currentThread = null;

  boardTitle.textContent = "Board Rules";
  boardSubtitle.textContent = "Read this before posting or replying.";

  setComposerVisibility(false);
  setSearchEnabled(false);
  newTopicTop.disabled = true;

  document.querySelectorAll(".channel[data-slug]").forEach((link) => {
    link.classList.remove("active");
  });

  if (rulesLink) {
    rulesLink.classList.add("active");
  }

  threadList.innerHTML = `
    <article class="thread rules-header-card">
      <div class="avatar yellow">!</div>
      <div>
        <button class="btn back-button" id="backFromRules" type="button">Back</button>
        <h3>SoftSin Studios board rules</h3>
        <p>These rules keep the message board useful, readable, and sane. The goal is not ceremony. The goal is a clean workshop.</p>
        <span class="tag warn">Required Reading</span>
      </div>
      <div class="meta">Rules</div>
    </article>

    ${boardRules.map((rule, index) => `
      <article class="thread rule-card">
        <div class="avatar">${index + 1}</div>
        <div>
          <h3>${escapeHtml(rule.title)}</h3>
          <p>${escapeHtml(rule.body)}</p>
        </div>
        <div class="meta">Rule ${index + 1}</div>
      </article>
    `).join("")}
  `;

  const backButton = document.getElementById("backFromRules");

  if (backButton) {
    backButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeRulesView();
    });
  }
}

function closeRulesView() {
  currentBoardView = "threads";

  if (rulesLink) {
    rulesLink.classList.remove("active");
  }

  setComposerVisibility(true);
  setSearchEnabled(true);

  if (currentCategory) {
    selectCategory(currentCategory.slug);
  }
}

function setComposerForSignedOut() {
  if (composerTitle) {
    composerTitle.disabled = true;
    composerTitle.hidden = Boolean(currentThread);
    composerTitle.value = "";
  }

  composerText.disabled = true;
  composerText.placeholder = currentThread ? "Sign in with Discord to reply..." : "Sign in with Discord to post...";

  updateComposerHelperText();

  postMessage.disabled = true;
  postMessage.textContent = currentThread ? "Post Reply" : "Create Thread";
  newTopicTop.disabled = true;

  setEditorDisabled(true);
}

function setComposerForSignedIn() {
  const inThread = Boolean(currentThread);

  if (composerTitle) {
    composerTitle.hidden = inThread;
    composerTitle.disabled = inThread;
  }

  composerText.disabled = false;
  composerText.placeholder = inThread ? "Write a reply..." : "Write the first post for this thread...";

  updateComposerHelperText();

  postMessage.disabled = false;
  postMessage.textContent = inThread ? "Post Reply" : "Create Thread";
  newTopicTop.disabled = false;

  setEditorDisabled(false);
  updateToolbarForRole();
}

function setSignedOut() {
  stopBoardPresence();

  currentUser = null;
  currentProfile = null;

  signedOutBox.hidden = false;
  signedInBox.hidden = true;
  setComposerForSignedOut();
}

function setSignedIn(user, profile) {
  currentUser = user;
  currentProfile = profile;

  signedOutBox.hidden = true;
  signedInBox.hidden = false;

  userName.textContent = getDisplayName(user, profile);
  userRole.textContent = profile?.role || "member";

  const avatar = getAvatar(user, profile);

  if (avatar) {
    userAvatar.src = avatar;
    userAvatar.hidden = false;
  } else {
    userAvatar.hidden = true;
  }

  setComposerForSignedIn();
  startBoardPresence();
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, bio")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Profile query failed:", error);
    return null;
  }

  return data;
}

async function refreshSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    setSignedOut();
    return;
  }

  const user = data.session.user;
  const profile = await getProfile(user.id);

  setSignedIn(user, profile);
}

async function signInWithDiscord() {
  const redirectTo = window.location.href.split("#")[0];

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo
    }
  });

  if (error) {
    console.error("Discord sign-in failed:", error);
    composerStatus.textContent = "Discord sign-in failed. Check console and Supabase redirect URLs.";
  }
}

async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out failed:", error);
    composerStatus.textContent = "Sign out failed. Check console.";
    return;
  }

  setSignedOut();
}


function setOnlineNowCount(value) {
  if (!onlineNowCount) return;

  const count = Number.isFinite(value) ? value : 0;
  onlineNowCount.textContent = formatCount(Math.max(0, count));
}

function updateBoardPresenceCount(channel = boardPresenceChannel) {
  if (!channel || channel !== boardPresenceChannel) return;

  const presenceState = channel.presenceState();
  const onlineCount = Object.keys(presenceState || {}).length;

  setOnlineNowCount(onlineCount);
}

async function stopBoardPresence() {
  const channel = boardPresenceChannel;

  boardPresenceChannel = null;
  boardPresenceUserKey = null;
  setOnlineNowCount(0);

  if (!channel) return;

  try {
    await supabase.removeChannel(channel);
  } catch (error) {
    console.warn("Board presence cleanup failed:", error);
  }
}

async function startBoardPresence() {
  if (!onlineNowCount) return;

  if (!currentUser?.id) {
    await stopBoardPresence();
    return;
  }

  if (boardPresenceChannel && boardPresenceUserKey === currentUser.id) {
    updateBoardPresenceCount();
    return;
  }

  await stopBoardPresence();

  const channel = supabase.channel("softsin-board-online", {
    config: {
      private: true,
      presence: {
        key: currentUser.id
      }
    }
  });

  boardPresenceChannel = channel;
  boardPresenceUserKey = currentUser.id;
  setOnlineNowCount(0);

  channel.on("presence", { event: "sync" }, () => {
    updateBoardPresenceCount(channel);
  });

  channel.subscribe(async (status) => {
    if (channel !== boardPresenceChannel) return;

    if (status === "SUBSCRIBED") {
      await channel.track({
        user_id: currentUser.id,
        display_name: getDisplayName(currentUser, currentProfile),
        online_at: new Date().toISOString()
      });
      updateBoardPresenceCount(channel);
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      console.warn("Board presence status:", status);
      setOnlineNowCount(0);
    }
  });
}


function setForumStat(element, value) {
  if (!element) return;

  element.textContent = value || "—";
}

function formatCount(value) {
  if (!Number.isFinite(value)) return "—";

  return new Intl.NumberFormat().format(value);
}

async function loadNewestMemberStat() {
  if (!newestMemberName) return;

  setForumStat(newestMemberName, "Loading...");

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, username, created_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Newest member stat failed:", error);
    setForumStat(newestMemberName, "Unavailable");
    return;
  }

  setForumStat(newestMemberName, data ? getProfileName(data) : "No members yet");
}

async function loadBoardTotalsStat() {
  const [threadsResult, postsResult] = await Promise.all([
    supabase
      .from("threads")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
  ]);

  if (threadsResult.error) {
    console.warn("Thread total stat failed:", threadsResult.error);
    setForumStat(threadTotalCount, "Unavailable");
  } else {
    setForumStat(threadTotalCount, formatCount(threadsResult.count));
  }

  if (postsResult.error) {
    console.warn("Post total stat failed:", postsResult.error);
    setForumStat(postTotalCount, "Unavailable");
  } else {
    setForumStat(postTotalCount, formatCount(postsResult.count));
  }
}

async function loadForumStats() {
  if (!boardPresenceChannel) {
    setOnlineNowCount(0);
  }

  await Promise.all([
    loadNewestMemberStat(),
    loadBoardTotalsStat()
  ]);
}

async function loadCategoryCounts(categories = currentCategories) {
  if (!categories.length) return;

  const { data, error } = await supabase
    .from("threads")
    .select("category_id")
    .is("deleted_at", null);

  if (error) {
    console.warn("Category count load failed:", error);
    return;
  }

  const countsById = new Map();

  (data || []).forEach((row) => {
    if (!row.category_id) return;
    countsById.set(row.category_id, (countsById.get(row.category_id) || 0) + 1);
  });

  categories.forEach((category) => {
    const pill = categoryList.querySelector(`.channel[data-slug="${category.slug}"] .pill`);

    if (pill) {
      const count = countsById.get(category.id) || 0;
      pill.textContent = String(count);
      pill.dataset.count = String(count);
    }
  });
}

function renderCategories(categories) {
  currentCategories = categories || [];
  categoryList.innerHTML = "";
  categoriesBySlug = new Map();

  categories.forEach((category, index) => {
    categoriesBySlug.set(category.slug, category);

    const item = document.createElement("a");
    item.href = "#";
    item.className = `channel${index === 0 ? " active" : ""}`;
    item.dataset.slug = category.slug;
    item.innerHTML = `
      <span>${escapeHtml(category.name)}</span>
      <span class="pill">0</span>
    `;

    item.addEventListener("click", (event) => {
      event.preventDefault();
      selectCategory(category.slug);
    });

    categoryList.appendChild(item);
  });

  const first = categories[0];

  if (first) {
    selectCategory(first.slug);
  }
}

function renderThreadLoading() {
  threadList.innerHTML = `
    <article class="thread">
      <div class="avatar">...</div>
      <div>
        <h3>Loading threads...</h3>
        <p>Checking Supabase for this channel.</p>
      </div>
      <div class="meta">Please wait</div>
    </article>
  `;
}

function renderThreadError(message) {
  threadList.innerHTML = `
    <article class="thread">
      <div class="avatar red">!</div>
      <div>
        <h3>Unable to load threads</h3>
        <p>${escapeHtml(message)}</p>
        <span class="tag hot">Read Error</span>
      </div>
      <div class="meta">Check console</div>
    </article>
  `;
}

function renderEmptyThreads(category) {
  const signInText = signedInBox.hidden
    ? "Sign in to start the first one."
    : "Create the first thread in this channel.";

  threadList.innerHTML = `
    <article class="thread">
      <div class="avatar green">+</div>
      <div>
        <h3>No threads yet in ${escapeHtml(category.name)}</h3>
        <p>${escapeHtml(signInText)}</p>
        <span class="tag">Empty Channel</span>
      </div>
      <div class="meta">0 replies</div>
    </article>
  `;
}

function renderNoSearchResults() {
  threadList.innerHTML = `
    <article class="thread">
      <div class="avatar red">?</div>
      <div>
        <h3>No matching threads</h3>
        <p>No threads in this channel match “${escapeHtml(currentSearchTerm)}”.</p>
        <span class="tag">Search</span>
      </div>
      <div class="meta">0 results</div>
    </article>
  `;
}

function renderThreads(threads, category, options = {}) {
  const { preserveLoaded = false } = options;

  currentThread = null;
  threadsById = new Map();

  if (!preserveLoaded) {
    loadedThreads = threads || [];
  }

  const visibleThreads = preserveLoaded ? threads || [] : getFilteredThreads();

  if (!loadedThreads.length) {
    renderEmptyThreads(category);
    refreshSession();
    return;
  }

  if (!visibleThreads.length) {
    renderNoSearchResults();
    refreshSession();
    return;
  }

  loadedThreads.forEach((thread) => {
    threadsById.set(thread.id, thread);
  });

  threadList.innerHTML = visibleThreads
    .map((thread) => {
      const profile = thread.profiles || {};
      const author = getProfileName(profile);
      const replyCount = Array.isArray(thread.posts) ? thread.posts.length : 0;
      const activityLabel = formatActivityLabel(thread.created_at, thread.updated_at);
      const createdDate = formatDateOnly(thread.created_at);
      const newTag = renderInlineNew(thread.id);
      const cleanBody = stripMarkdownForPreview(thread.body || "");
      const preview =
        cleanBody.length > 180
          ? `${cleanBody.slice(0, 180)}...`
          : cleanBody;

      return `
        <article class="thread clickable-thread" data-thread-id="${escapeHtml(thread.id)}">
          ${renderAvatar(profile)}
          <div>
            <h3>${escapeHtml(thread.title)}</h3>
            <div class="thread-author">by ${escapeHtml(author)} - ${escapeHtml(createdDate)}${newTag}</div>
            <p>${escapeHtml(preview)}</p>
            ${renderThreadTags(thread, true, true)}
          </div>
          <div class="meta">
            ${replyCount} ${replyCount === 1 ? "reply" : "replies"}<br>
            ${escapeHtml(activityLabel)}
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".thread[data-thread-id]").forEach((row) => {
    row.addEventListener("click", () => {
      openThread(row.dataset.threadId);
    });
  });

  refreshSession();
}

function applyThreadSearch() {
  if (currentThread || currentBoardView !== "threads") return;

  const filtered = getFilteredThreads();
  renderThreads(filtered, currentCategory, { preserveLoaded: true });
}

async function loadThreadsForCategory(category) {
  currentBoardView = "threads";
  setComposerVisibility(true);
  setSearchEnabled(true);

  if (!category?.id) {
    loadedThreads = [];
    renderEmptyThreads(category);
    return;
  }

  renderThreadLoading();

  const { data, error } = await supabase
    .from("threads")
    .select(`
      id,
      title,
      body,
      pinned,
      locked,
      created_at,
      updated_at,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url,
        role
      ),
      posts (
        id
      )
    `)
    .eq("category_id", category.id)
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Thread load failed:", error);
    renderThreadError(error.message || "Unknown thread loading error.");
    return;
  }

  loadedThreads = data || [];
  renderThreads(loadedThreads, category, { preserveLoaded: true });
}

function renderPostLoading() {
  threadList.insertAdjacentHTML(
    "beforeend",
    `
      <article class="thread" id="replyLoadingRow">
        <div class="avatar">...</div>
        <div>
          <h3>Loading replies...</h3>
          <p>Checking Supabase for replies.</p>
        </div>
        <div class="meta">Please wait</div>
      </article>
    `
  );
}

function renderPostError(message) {
  threadList.insertAdjacentHTML(
    "beforeend",
    `
      <article class="thread">
        <div class="avatar red">!</div>
        <div>
          <h3>Unable to load replies</h3>
          <p>${escapeHtml(message)}</p>
          <span class="tag hot">Read Error</span>
        </div>
        <div class="meta">Check console</div>
      </article>
    `
  );
}

function renderReplyEditForm(post) {
  const editorId = `editReplyBody-${post.id}`;

  return `
    <div class="edit-panel reply-edit-panel">
      <label class="edit-label" for="${escapeHtml(editorId)}">Edit reply</label>
      ${renderMiniEditor(editorId, post.body)}
      <div class="edit-actions">
        <button class="btn primary save-reply-edit-button" type="button" data-post-id="${escapeHtml(post.id)}">Save Reply</button>
        <button class="btn cancel-reply-edit-button" type="button" data-post-id="${escapeHtml(post.id)}">Cancel</button>
      </div>
    </div>
  `;
}

function renderPosts(posts) {
  loadedPosts = posts || [];

  if (!loadedPosts.length) {
    threadList.insertAdjacentHTML(
      "beforeend",
      `
        <article class="thread">
          <div class="avatar green">+</div>
          <div>
            <h3>No replies yet</h3>
            <p>${signedInBox.hidden ? "Sign in to reply." : "Be the first to reply."}</p>
            <span class="tag">Empty Thread</span>
          </div>
          <div class="meta">0 replies</div>
        </article>
      `
    );
    return;
  }

  threadList.insertAdjacentHTML(
    "beforeend",
    loadedPosts
      .map((post) => {
        const profile = post.profiles || {};
        const author = getProfileName(profile);
        const activityLabel = formatActivityLabel(post.created_at, post.updated_at);
        const isEditing = editingReplyId === post.id;

        if (isEditing) {
          return `
            <article class="thread post-row editing-row" data-post-id="${escapeHtml(post.id)}">
              ${renderAvatar(profile)}
              <div>
                <h3>${escapeHtml(author)}</h3>
                <div class="thread-author">${escapeHtml(activityLabel)}</div>
                ${renderReplyEditForm(post)}
              </div>
            </article>
          `;
        }

        return `
          <article class="thread post-row" data-post-id="${escapeHtml(post.id)}">
            ${renderAvatar(profile)}
            <div>
              <h3>${escapeHtml(author)}</h3>
              <div class="thread-author">${escapeHtml(activityLabel)}</div>
              <div class="post-body-box markdown-body">${renderMarkdownLite(post.body)}</div>
              <span class="tag">Reply</span>
              ${renderEditedTag(post.created_at, post.updated_at)}
              ${renderReplyControls(post)}
            </div>
          </article>
        `;
      })
      .join("")
  );

  attachReplyControlListeners();

  if (editingReplyId) {
    attachMiniEditor(`editReplyBody-${editingReplyId}`);
  }
}

async function loadPostsForThread(threadId) {
  renderPostLoading();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      body,
      created_at,
      updated_at,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url,
        role
      )
    `)
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const loadingRow = document.getElementById("replyLoadingRow");

  if (loadingRow) {
    loadingRow.remove();
  }

  if (error) {
    console.error("Post load failed:", error);
    renderPostError(error.message || "Unknown reply loading error.");
    return;
  }

  loadedPosts = data || [];
  renderPosts(loadedPosts);
}

function renderAdminControls(thread) {
  if (!isModeratorOrAdmin()) return "";

  const pinText = thread.pinned ? "Unpin" : "Pin";
  const lockText = thread.locked ? "Unlock" : "Lock";

  return `
    <button class="btn admin-button" id="togglePinThread" type="button">${pinText}</button>
    <button class="btn admin-button" id="toggleLockThread" type="button">${lockText}</button>
    <button class="btn red admin-button" id="deleteThread" type="button">Delete Thread</button>
  `;
}

async function updateThreadModeration(threadId, patch, successMessage) {
  if (!isModeratorOrAdmin()) {
    composerStatus.textContent = "Admin or moderator access required.";
    return;
  }

  composerStatus.textContent = "Updating thread...";

  const { data, error } = await supabase
    .from("threads")
    .update(patch)
    .eq("id", threadId)
    .select(`
      id,
      title,
      body,
      pinned,
      locked,
      created_at,
      updated_at,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url,
        role
      ),
      posts (
        id
      )
    `)
    .maybeSingle();

  if (error) {
    console.error("Thread moderation update failed:", error);
    composerStatus.textContent = error.message || "Thread update failed.";
    return;
  }

  composerStatus.textContent = successMessage;

  if (data) {
    currentThread = data;
    threadsById.set(threadId, data);

    loadedThreads = loadedThreads.map((thread) =>
      thread.id === threadId ? data : thread
    );
  } else {
    currentThread = {
      ...currentThread,
      ...patch
    };
    threadsById.set(threadId, currentThread);

    loadedThreads = loadedThreads.map((thread) =>
      thread.id === threadId ? currentThread : thread
    );
  }

  await openThread(threadId);
}

async function softDeleteThreadAndReplies(threadId) {
  if (!isModeratorOrAdmin()) {
    composerStatus.textContent = "Admin or moderator access required.";
    return;
  }

  composerStatus.textContent = "Deleting thread and replies...";

  const { error } = await supabase.rpc("soft_delete_thread_and_replies", {
    target_thread_id: threadId
  });

  if (error) {
    console.error("Thread RPC soft delete failed:", error);
    composerStatus.textContent = error.message || "Thread delete failed.";
    return;
  }

  threadsById.delete(threadId);
  loadedThreads = loadedThreads.filter((thread) => thread.id !== threadId);
  currentThread = null;
  editingThreadId = null;
  editingReplyId = null;
  currentBoardView = "threads";

  boardTitle.textContent = currentCategory?.name || "General";
  boardSubtitle.textContent =
    currentCategory?.description || "SoftSin Studios discussion.";

  if (composerTitle) {
    composerTitle.hidden = false;
    composerTitle.disabled = signedInBox.hidden;
  }

  composerText.value = "";
  composerText.placeholder = signedInBox.hidden
    ? "Sign in with Discord to post..."
    : "Write the first post for this thread...";

  updateComposerHelperText();

  postMessage.textContent = "Create Thread";
  postMessage.disabled = signedInBox.hidden;

  if (currentCategory) {
    await loadThreadsForCategory(currentCategory);
  } else {
    applyThreadSearch();
  }

  await loadCategoryCounts();
}

async function softDeleteReply(postId) {
  if (!isModeratorOrAdmin()) {
    composerStatus.textContent = "Admin or moderator access required.";
    return;
  }

  if (!currentThread?.id) {
    composerStatus.textContent = "Open a thread before moderating replies.";
    return;
  }

  composerStatus.textContent = "Deleting reply...";

  const threadId = currentThread.id;

  const { error } = await supabase.rpc("soft_delete_reply", {
    target_post_id: postId
  });

  if (error) {
    console.error("Reply RPC soft delete failed:", error);
    composerStatus.textContent = error.message || "Reply delete failed.";
    return;
  }

  composerStatus.textContent = "Reply deleted.";

  if (currentCategory) {
    await loadThreadsForCategory(currentCategory);
  }

  await openThread(threadId);
  await loadCategoryCounts();
}

function startThreadEdit(threadId) {
  if (!canEditThread(currentThread)) {
    composerStatus.textContent = "You do not have permission to edit this thread.";
    return;
  }

  editingThreadId = threadId;
  editingReplyId = null;
  openThread(threadId);
}

function cancelThreadEdit() {
  const threadId = currentThread?.id;
  editingThreadId = null;

  if (threadId) {
    openThread(threadId);
  }
}

async function saveThreadEdit(threadId) {
  if (!canEditThread(currentThread)) {
    composerStatus.textContent = "You do not have permission to edit this thread.";
    return;
  }

  const titleInput = document.getElementById("editThreadTitle");
  const bodyInput = document.getElementById("editThreadBody");
  const title = titleInput?.value.trim() || "";
  const body = bodyInput?.value.trim() || "";

  if (title.length < 3) {
    composerStatus.textContent = "Thread title must be at least 3 characters.";
    titleInput?.focus();
    return;
  }

  if (title.length > 140) {
    composerStatus.textContent = "Thread title must be 140 characters or less.";
    titleInput?.focus();
    return;
  }

  if (!body) {
    composerStatus.textContent = "Thread body cannot be empty.";
    bodyInput?.focus();
    return;
  }

  if (body.length > 20000) {
    composerStatus.textContent = "Thread body is too long.";
    bodyInput?.focus();
    return;
  }

  if (!validateUserTextPermissions(title, body)) {
    bodyInput?.focus();
    return;
  }

  composerStatus.textContent = "Saving thread edit...";

  const { error } = await supabase
    .from("threads")
    .update({
      title,
      body,
      updated_at: new Date().toISOString()
    })
    .eq("id", threadId);

  if (error) {
    console.error("Thread edit failed:", error);
    composerStatus.textContent = error.message || "Thread edit failed.";
    return;
  }

  editingThreadId = null;
  composerStatus.textContent = "Thread updated.";

  if (currentCategory) {
    await loadThreadsForCategory(currentCategory);
  }

  await openThread(threadId);
}

function startReplyEdit(postId) {
  const post = loadedPosts.find((item) => item.id === postId);

  if (!post || !canEditPost(post)) {
    composerStatus.textContent = "You do not have permission to edit this reply.";
    return;
  }

  editingReplyId = postId;
  const threadId = currentThread?.id;

  if (threadId) {
    openThread(threadId);
  }
}

function cancelReplyEdit() {
  const threadId = currentThread?.id;
  editingReplyId = null;

  if (threadId) {
    openThread(threadId);
  }
}

async function saveReplyEdit(postId) {
  const post = loadedPosts.find((item) => item.id === postId);

  if (!post || !canEditPost(post)) {
    composerStatus.textContent = "You do not have permission to edit this reply.";
    return;
  }

  const bodyInput = document.getElementById(`editReplyBody-${postId}`);
  const body = bodyInput?.value.trim() || "";

  if (!body) {
    composerStatus.textContent = "Reply cannot be empty.";
    bodyInput?.focus();
    return;
  }

  if (body.length > 20000) {
    composerStatus.textContent = "Reply is too long.";
    bodyInput?.focus();
    return;
  }

  if (!validateUserTextPermissions(body)) {
    bodyInput?.focus();
    return;
  }

  composerStatus.textContent = "Saving reply edit...";

  const { error } = await supabase
    .from("posts")
    .update({
      body,
      updated_at: new Date().toISOString()
    })
    .eq("id", postId);

  if (error) {
    console.error("Reply edit failed:", error);
    composerStatus.textContent = error.message || "Reply edit failed.";
    return;
  }

  const threadId = currentThread?.id;
  editingReplyId = null;
  composerStatus.textContent = "Reply updated.";

  if (currentCategory) {
    await loadThreadsForCategory(currentCategory);
  }

  if (threadId) {
    await openThread(threadId);
  }
}

function attachReplyControlListeners() {
  document.querySelectorAll(".edit-reply-button").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      startReplyEdit(button.dataset.postId);
    });
  });

  document.querySelectorAll(".save-reply-edit-button").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await saveReplyEdit(button.dataset.postId);
    });
  });

  document.querySelectorAll(".cancel-reply-edit-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cancelReplyEdit();
    });
  });

  if (!isModeratorOrAdmin()) return;

  document.querySelectorAll(".delete-reply-button").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const postId = button.dataset.postId;

      if (!postId) return;

      const confirmed = window.confirm("Soft delete this reply? It will be hidden from the thread.");

      if (!confirmed) return;

      await softDeleteReply(postId);
    });
  });
}

function attachAdminControlListeners(thread) {
  const editButton = document.getElementById("editThread");
  const saveEditButton = document.getElementById("saveThreadEdit");
  const cancelEditButton = document.getElementById("cancelThreadEdit");

  if (editButton) {
    editButton.addEventListener("click", (event) => {
      event.preventDefault();
      startThreadEdit(thread.id);
    });
  }

  if (saveEditButton) {
    saveEditButton.addEventListener("click", async (event) => {
      event.preventDefault();
      await saveThreadEdit(thread.id);
    });
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener("click", (event) => {
      event.preventDefault();
      cancelThreadEdit();
    });
  }

  if (!isModeratorOrAdmin()) return;

  const pinButton = document.getElementById("togglePinThread");
  const lockButton = document.getElementById("toggleLockThread");
  const deleteButton = document.getElementById("deleteThread");

  if (pinButton) {
    pinButton.addEventListener("click", async (event) => {
      event.preventDefault();

      await updateThreadModeration(
        thread.id,
        { pinned: !thread.pinned },
        thread.pinned ? "Thread unpinned." : "Thread pinned."
      );
    });
  }

  if (lockButton) {
    lockButton.addEventListener("click", async (event) => {
      event.preventDefault();

      await updateThreadModeration(
        thread.id,
        { locked: !thread.locked },
        thread.locked ? "Thread unlocked." : "Thread locked."
      );
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", async (event) => {
      event.preventDefault();

      const confirmed = window.confirm("Soft delete this thread and all replies? It will be hidden from the board.");

      if (!confirmed) return;

      await softDeleteThreadAndReplies(thread.id);
    });
  }
}

function closeThreadView() {
  currentBoardView = "threads";
  currentThread = null;
  editingThreadId = null;
  editingReplyId = null;

  if (!currentCategory) return;

  boardTitle.textContent = currentCategory.name;
  boardSubtitle.textContent =
    currentCategory.description || "SoftSin Studios discussion.";

  if (composerTitle) {
    composerTitle.hidden = false;
    composerTitle.disabled = signedInBox.hidden;
  }

  composerText.placeholder = signedInBox.hidden
    ? "Sign in with Discord to post..."
    : "Write the first post for this thread...";

  updateComposerHelperText();

  postMessage.textContent = "Create Thread";
  postMessage.disabled = signedInBox.hidden;

  applyThreadSearch();
}

async function openThread(threadId) {
  currentBoardView = "thread";

  const thread = threadsById.get(threadId);

  if (!thread) return;

  const wasNew = isThreadNew(thread.id);
  currentThread = thread;

  const profile = thread.profiles || {};
  const author = getProfileName(profile);
  const createdDate = formatDateOnly(thread.created_at);
  const newTag = wasNew ? ` - <span class="inline-new">NEW</span>` : "";
  const editedInline = renderInlineEdited(thread.created_at, thread.updated_at);
  const isThreadEditing = editingThreadId === thread.id;

  boardTitle.textContent = thread.title;
  boardSubtitle.textContent = currentCategory
    ? `${currentCategory.name} thread`
    : "Thread";

  if (composerTitle) {
    composerTitle.hidden = true;
    composerTitle.disabled = true;
  }

  setEditorPreviewMode(false);

  composerText.placeholder = signedInBox.hidden
    ? "Sign in with Discord to reply..."
    : "Write a reply...";

  updateComposerHelperText();

  postMessage.textContent = "Post Reply";
  postMessage.disabled = signedInBox.hidden || thread.locked;
  setEditorDisabled(signedInBox.hidden || thread.locked);

  if (!signedInBox.hidden && thread.locked) {
    composerStatus.textContent = "This thread is locked.";
  }

  threadList.innerHTML = `
    <div class="thread-view-actions">
      <button class="btn back-button" id="backToCategory" type="button">
        Back to ${escapeHtml(currentCategory?.name || "Channel")}
      </button>
    </div>

    <article class="thread thread-detail${isThreadEditing ? " editing-row" : ""}">
      ${renderAvatar(profile)}
      <div>
        ${isThreadEditing ? `
          <div class="edit-panel thread-edit-panel">
            <label class="edit-label" for="editThreadTitle">Edit thread title</label>
            <input class="edit-title-input" id="editThreadTitle" type="text" maxlength="140" value="${escapeHtml(thread.title)}" />
            <label class="edit-label" for="editThreadBody">Edit thread body</label>
            ${renderMiniEditor("editThreadBody", thread.body)}
            <div class="edit-actions">
              <button class="btn primary" id="saveThreadEdit" type="button">Save Thread</button>
              <button class="btn" id="cancelThreadEdit" type="button">Cancel</button>
            </div>
          </div>
        ` : `
          <h3>${escapeHtml(thread.title)}</h3>
          <div class="thread-author">by ${escapeHtml(author)} - ${escapeHtml(createdDate)}${editedInline}${newTag}</div>
          <div class="post-body-box markdown-body">${renderMarkdownLite(thread.body)}</div>
          <span class="tag good">Original Post</span>
          ${renderThreadTags(thread, false, false)}
          ${renderThreadControls(thread)}
        `}
      </div>
    </article>
  `;

  markThreadRead(thread.id);

  const backButton = document.getElementById("backToCategory");

  if (backButton) {
    backButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeThreadView();
    });
  }

  attachAdminControlListeners(thread);

  if (isThreadEditing) {
    attachMiniEditor("editThreadBody");
  }

  updateToolbarForRole();

  await loadPostsForThread(thread.id);
}

function selectCategory(slug) {
  currentBoardView = "threads";
  editingThreadId = null;
  editingReplyId = null;
  setComposerVisibility(true);
  setSearchEnabled(true);
  setEditorPreviewMode(false);

  if (rulesLink) {
    rulesLink.classList.remove("active");
  }

  const category =
    categoriesBySlug.get(slug) ||
    fallbackCategories.find((item) => item.slug === slug);

  if (!category) return;

  currentCategory = category;
  currentThread = null;
  currentSearchTerm = "";

  if (searchInput) {
    searchInput.value = "";
  }

  document.querySelectorAll(".channel[data-slug]").forEach((link) => {
    link.classList.toggle("active", link.dataset.slug === slug);
  });

  boardTitle.textContent = category.name;
  boardSubtitle.textContent = category.description || "SoftSin Studios discussion.";

  if (composerTitle) {
    composerTitle.hidden = false;
    composerTitle.disabled = signedInBox.hidden;
  }

  composerText.placeholder = signedInBox.hidden
    ? "Sign in with Discord to post..."
    : "Write the first post for this thread...";

  updateComposerHelperText();

  postMessage.textContent = "Create Thread";
  postMessage.disabled = signedInBox.hidden;
  setEditorDisabled(signedInBox.hidden);

  loadThreadsForCategory(category);
}

async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, sort_order")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    console.warn("Using fallback categories:", error);
    renderCategories(fallbackCategories);
    await loadCategoryCounts(fallbackCategories);
    await loadForumStats();
    return;
  }

  renderCategories(data);
  await loadCategoryCounts(data);
  await loadForumStats();
}

async function createThread() {
  if (currentBoardView !== "threads") return;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    composerStatus.textContent = "Sign in with Discord before creating a thread.";
    return;
  }

  if (!currentCategory?.id) {
    composerStatus.textContent = "Select a valid channel before creating a thread.";
    return;
  }

  const title = composerTitle?.value.trim() || "";
  const body = composerText.value.trim();

  if (title.length < 3) {
    composerStatus.textContent = "Thread title must be at least 3 characters.";
    composerTitle?.focus();
    return;
  }

  if (title.length > 140) {
    composerStatus.textContent = "Thread title must be 140 characters or less.";
    composerTitle?.focus();
    return;
  }

  if (!body) {
    composerStatus.textContent = "Thread body cannot be empty.";
    composerText.focus();
    return;
  }

  if (body.length > 20000) {
    composerStatus.textContent = "Thread body is too long.";
    composerText.focus();
    return;
  }

  if (!validateUserTextPermissions(title, body)) {
    composerText.focus();
    return;
  }

  postMessage.disabled = true;
  composerStatus.textContent = "Creating thread...";

  const { error } = await supabase
    .from("threads")
    .insert({
      category_id: currentCategory.id,
      author_id: sessionData.session.user.id,
      title,
      body
    });

  if (error) {
    console.error("Thread creation failed:", error);
    composerStatus.textContent = error.message || "Thread creation failed.";
    postMessage.disabled = false;
    return;
  }

  if (composerTitle) {
    composerTitle.value = "";
  }

  composerText.value = "";
  updateCharCount();
  setEditorPreviewMode(false);

  composerStatus.textContent = "Thread created.";
  postMessage.disabled = false;

  currentSearchTerm = "";

  if (searchInput) {
    searchInput.value = "";
  }

  await loadThreadsForCategory(currentCategory);
  await loadCategoryCounts();
}

async function createReply() {
  if (currentBoardView !== "thread") return;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    composerStatus.textContent = "Sign in with Discord before replying.";
    return;
  }

  if (!currentThread?.id) {
    composerStatus.textContent = "Open a thread before replying.";
    return;
  }

  if (currentThread.locked) {
    composerStatus.textContent = "This thread is locked.";
    return;
  }

  const body = composerText.value.trim();

  if (!body) {
    composerStatus.textContent = "Reply cannot be empty.";
    composerText.focus();
    return;
  }

  if (body.length > 20000) {
    composerStatus.textContent = "Reply is too long.";
    composerText.focus();
    return;
  }

  if (!validateUserTextPermissions(body)) {
    composerText.focus();
    return;
  }

  postMessage.disabled = true;
  composerStatus.textContent = "Posting reply...";

  const { error } = await supabase
    .from("posts")
    .insert({
      thread_id: currentThread.id,
      author_id: sessionData.session.user.id,
      body
    });

  if (error) {
    console.error("Reply creation failed:", error);
    composerStatus.textContent = error.message || "Reply creation failed.";
    postMessage.disabled = false;
    return;
  }

  const threadId = currentThread.id;

  composerText.value = "";
  updateCharCount();
  setEditorPreviewMode(false);

  composerStatus.textContent = "Reply posted.";
  postMessage.disabled = false;

  if (currentCategory) {
    await loadThreadsForCategory(currentCategory);
  }

  await openThread(threadId);
}

postMessage.addEventListener("click", () => {
  if (currentThread) {
    createReply();
    return;
  }

  createThread();
});

newTopicTop.addEventListener("click", () => {
  if (currentBoardView === "rules") {
    closeRulesView();
  } else if (currentThread) {
    closeThreadView();
  } else if (currentCategory) {
    currentSearchTerm = "";

    if (searchInput) {
      searchInput.value = "";
    }

    loadThreadsForCategory(currentCategory);
  }

  if (composerTitle && !composerTitle.hidden) {
    composerTitle.focus();
  } else {
    composerText.focus();
  }

  updateComposerHelperText();
});

if (searchInput) {
  searchInput.addEventListener("input", () => {
    currentSearchTerm = searchInput.value;
    applyThreadSearch();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      searchInput.value = "";
      currentSearchTerm = "";
      applyThreadSearch();
      searchInput.blur();
    }
  });
}

editorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyEditorAction(button.dataset.editorAction);
  });
});

if (editorPreviewToggle) {
  editorPreviewToggle.addEventListener("click", () => {
    if (composerText.disabled) return;
    setEditorPreviewMode(!editorPreviewMode);
  });
}

if (composerText) {
  composerText.addEventListener("input", () => {
    updateCharCount();

    if (editorPreviewMode) {
      syncEditorPreview();
    }
  });
}

if (rulesLink) {
  rulesLink.addEventListener("click", (event) => {
    event.preventDefault();
    renderRulesView();
  });
}

if (openRulesReminder) {
  openRulesReminder.addEventListener("click", (event) => {
    event.preventDefault();
    renderRulesView();
  });
}

loginDiscord.addEventListener("click", signInWithDiscord);
logout.addEventListener("click", signOut);

supabase.auth.onAuthStateChange(() => {
  refreshSession();

  if (currentBoardView === "rules") {
    return;
  }

  if (currentThread) {
    openThread(currentThread.id);
    return;
  }

  if (currentCategory) {
    loadThreadsForCategory(currentCategory);
  }
});

updateCharCount();
setEditorDisabled(true);
loadCategories();
refreshSession();