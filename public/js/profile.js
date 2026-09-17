import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pnpijueflzvlyzzmhdwa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ts2QrwDwmmIrXbSzG14fBQ_REyHdGS5";
const BOARD_IMAGE_CLEANUP_URL = "https://files.softsinstudios.com/website-images/board-cleanup.php";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
});

function clearAuthCredentialsFromUrl() {
  const url = new URL(window.location.href);
  const authQueryKeys = ["code", "error", "error_code", "error_description", "sb_flow_id"];
  const hasAuthQuery = authQueryKeys.some((key) => url.searchParams.has(key));
  const hasAuthFragment = /(^|&)(access_token|refresh_token|expires_at|expires_in|provider_token|token_type)=/i.test(
    url.hash.replace(/^#/, "")
  );

  if (!hasAuthQuery && !hasAuthFragment) return;
  authQueryKeys.forEach((key) => url.searchParams.delete(key));
  if (hasAuthFragment) url.hash = "";
  window.history.replaceState(window.history.state, "", url);
}

const signedOutProfile = document.getElementById("signedOutProfile");
const signedInProfile = document.getElementById("signedInProfile");
const loginDiscord = document.getElementById("loginDiscord");
const logout = document.getElementById("logout");

const profileAvatar = document.getElementById("profileAvatar");
const profileDisplayHeading = document.getElementById("profileDisplayHeading");
const profileMeta = document.getElementById("profileMeta");

const profileForm = document.getElementById("profileForm");
const displayNameInput = document.getElementById("displayNameInput");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const roleValue = document.getElementById("roleValue");
const emailValue = document.getElementById("emailValue");
const profileStatus = document.getElementById("profileStatus");
const saveProfile = document.getElementById("saveProfile");
const deleteConfirmInput = document.getElementById("deleteConfirmInput");
const deleteProfile = document.getElementById("deleteProfile");
const dangerZone = document.getElementById("dangerZone");
const adminDashboard = document.getElementById("adminDashboard");
const refreshAdminDashboard = document.getElementById("refreshAdminDashboard");
const adminHealthNote = document.getElementById("adminHealthNote");
const adminReportList = document.getElementById("adminReportList");
const adminReportFilters = Array.from(document.querySelectorAll(".admin-report-filter"));
const statActiveReports = document.getElementById("statActiveReports");
const statReviewingReports = document.getElementById("statReviewingReports");
const statThreadsDay = document.getElementById("statThreadsDay");
const statRepliesDay = document.getElementById("statRepliesDay");
const statMembersWeek = document.getElementById("statMembersWeek");
const statLockedThreads = document.getElementById("statLockedThreads");
const statReportsClosedWeek = document.getElementById("statReportsClosedWeek");
const statRemovedWeek = document.getElementById("statRemovedWeek");
const statOrphanImages = document.getElementById("statOrphanImages");
const statOrphanBytes = document.getElementById("statOrphanBytes");
const cleanOrphanImages = document.getElementById("cleanOrphanImages");
const adminUploadHealth = document.getElementById("adminUploadHealth");
const memberSearchInput = document.getElementById("memberSearchInput");
const memberSearchButton = document.getElementById("memberSearchButton");
const memberSearchResults = document.getElementById("memberSearchResults");
const sanctionForm = document.getElementById("sanctionForm");
const sanctionTarget = document.getElementById("sanctionTarget");
const sanctionType = document.getElementById("sanctionType");
const sanctionDuration = document.getElementById("sanctionDuration");
const sanctionPublicReason = document.getElementById("sanctionPublicReason");
const sanctionPrivateNote = document.getElementById("sanctionPrivateNote");
const sanctionStatus = document.getElementById("sanctionStatus");
const applySanction = document.getElementById("applySanction");
const refreshSanctions = document.getElementById("refreshSanctions");
const sanctionHistory = document.getElementById("sanctionHistory");

let currentUser = null;
let currentProfile = null;
let adminReportFilter = "active";
let selectedSanctionTarget = null;

const reportReasonLabels = {
  spam: "Spam or promotion",
  harassment: "Harassment or targeted abuse",
  illegal: "Illegal or exploitative content",
  impersonation: "Impersonation or identity abuse",
  misinformation: "Dangerous misinformation",
  "off-topic": "Off-topic or disruptive",
  other: "Other"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getProfileName(profile) {
  return profile?.display_name || profile?.username || "SoftSin member";
}

function formatDate(value) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function contentExcerpt(value) {
  const clean = String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 260 ? `${clean.slice(0, 257)}...` : clean;
}

function isStaffProfile(profile = currentProfile) {
  return profile?.role === "admin" || profile?.role === "moderator";
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

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function validateProfile(displayName, username, bio) {
  if (displayName.length < 2) {
    return "Display name must be at least 2 characters.";
  }

  if (displayName.length > 80) {
    return "Display name must be 80 characters or less.";
  }

  if (username && username.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (username && username.length > 40) {
    return "Username must be 40 characters or less.";
  }

  if (username && !/^[a-z0-9_-]+$/.test(username)) {
    return "Username can only use lowercase letters, numbers, underscores, and dashes.";
  }

  if (bio.length > 500) {
    return "Bio must be 500 characters or less.";
  }

  return "";
}

function setSignedOut() {
  currentUser = null;
  currentProfile = null;

  signedOutProfile.hidden = false;
  signedInProfile.hidden = true;
  if (adminDashboard) adminDashboard.hidden = true;

  if (deleteConfirmInput) {
    deleteConfirmInput.value = "";
  }

  if (deleteProfile) {
    deleteProfile.disabled = true;
  }
}

function renderProfile(user, profile) {
  const displayName = getDisplayName(user, profile);
  const username = profile?.username || "";
  const bio = profile?.bio || "";
  const role = profile?.role || "member";
  const email = user?.email || user?.user_metadata?.email || "Not available";
  const avatar = getAvatar(user, profile);

  profileDisplayHeading.textContent = displayName;
  profileMeta.textContent = username ? `@${username}` : "No username set";

  displayNameInput.value = displayName;
  usernameInput.value = username;
  bioInput.value = bio;

  roleValue.textContent = role;
  emailValue.textContent = email;
  if (dangerZone) dangerZone.hidden = role === "admin";
  if (adminUploadHealth) adminUploadHealth.hidden = role !== "admin";

  if (avatar) {
    profileAvatar.src = avatar;
    profileAvatar.hidden = false;
  } else {
    profileAvatar.hidden = true;
  }

  profileStatus.textContent = "Profile loaded.";
}

function setSignedIn(user, profile) {
  currentUser = user;
  currentProfile = profile;

  signedOutProfile.hidden = true;
  signedInProfile.hidden = false;

  renderProfile(user, profile);
  updateDeleteButtonState();

  if (adminDashboard) {
    adminDashboard.hidden = !isStaffProfile(profile);
  }

  if (isStaffProfile(profile)) {
    loadAdminDashboard();
  }
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, bio")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile query failed:", error);
    profileStatus.textContent = error.message || "Unable to load profile.";
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
  }
}

async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out failed:", error);
    profileStatus.textContent = error.message || "Sign out failed.";
    return;
  }

  setSignedOut();
}

async function saveProfileChanges() {
  if (!currentUser) {
    profileStatus.textContent = "Sign in before saving your profile.";
    return;
  }

  const displayName = displayNameInput.value.trim();
  const username = normalizeUsername(usernameInput.value);
  const bio = bioInput.value.trim();
  const avatarUrl = getAvatar(currentUser, currentProfile);

  const validationError = validateProfile(displayName, username, bio);

  if (validationError) {
    profileStatus.textContent = validationError;
    return;
  }

  saveProfile.disabled = true;
  profileStatus.textContent = "Saving profile...";

  const profilePayload = {
    id: currentUser.id,
    display_name: displayName,
    username: username || null,
    bio,
    avatar_url: avatarUrl || null
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profilePayload, {
      onConflict: "id"
    })
    .select("id, username, display_name, avatar_url, role, bio")
    .maybeSingle();

  if (error) {
    console.error("Profile save failed:", error);
    profileStatus.textContent = error.message || "Profile save failed.";
    saveProfile.disabled = false;
    return;
  }

  currentProfile = data || {
    ...currentProfile,
    ...profilePayload
  };

  renderProfile(currentUser, currentProfile);

  profileStatus.textContent = "Profile saved.";
  saveProfile.disabled = false;
}

function setStat(element, result) {
  if (!element) return;
  const count = result?.count || 0;
  element.textContent = result?.error ? "!" : new Intl.NumberFormat().format(count);
  element.closest(".admin-stat")?.classList.toggle("active-metric", !result?.error && count > 0);
  element.closest(".admin-stat")?.classList.toggle("metric-error", Boolean(result?.error));
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = bytes;
  let unit = -1;
  do {
    amount /= 1024;
    unit++;
  } while (amount >= 1024 && unit < units.length - 1);
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${units[unit]}`;
}

async function loadBoardHealth() {
  if (!isStaffProfile()) return;

  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const orphanCutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  adminHealthNote.textContent = "Refreshing board health...";

  const results = await Promise.all([
    supabase.from("board_reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    supabase.from("board_reports").select("id", { count: "exact", head: true }).eq("status", "reviewing"),
    supabase.from("threads").select("id", { count: "exact", head: true }).gte("created_at", dayAgo).is("deleted_at", null),
    supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", dayAgo).is("deleted_at", null),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("threads").select("id", { count: "exact", head: true }).eq("locked", true).is("deleted_at", null),
    supabase.from("board_reports").select("id", { count: "exact", head: true }).in("status", ["resolved", "dismissed"]).gte("updated_at", weekAgo),
    supabase.from("threads").select("id", { count: "exact", head: true }).gte("deleted_at", weekAgo),
    supabase.from("posts").select("id", { count: "exact", head: true }).gte("deleted_at", weekAgo),
    supabase.from("board_image_uploads").select("id, byte_size").eq("status", "pending").lt("created_at", orphanCutoff)
  ]);

  setStat(statActiveReports, results[0]);
  setStat(statReviewingReports, results[1]);
  setStat(statThreadsDay, results[2]);
  setStat(statRepliesDay, results[3]);
  setStat(statMembersWeek, results[4]);
  setStat(statLockedThreads, results[5]);
  setStat(statReportsClosedWeek, results[6]);

  const removedHasError = results[7].error || results[8].error;
  const removedCount = (results[7].count || 0) + (results[8].count || 0);
  const removedCard = statRemovedWeek.closest(".admin-stat");
  statRemovedWeek.textContent = removedHasError ? "!" : new Intl.NumberFormat().format(removedCount);
  removedCard?.classList.toggle("active-metric", !removedHasError && removedCount > 0);
  removedCard?.classList.toggle("metric-error", removedHasError);

  const orphanResult = results[9];
  statOrphanImages.textContent = orphanResult.error ? "!" : new Intl.NumberFormat().format(orphanResult.data?.length || 0);
  statOrphanBytes.textContent = orphanResult.error
    ? "!"
    : formatBytes((orphanResult.data || []).reduce((sum, item) => sum + Number(item.byte_size || 0), 0));
  const orphanCount = orphanResult.data?.length || 0;
  [statOrphanImages, statOrphanBytes].forEach((element) => {
    const card = element.closest(".admin-stat");
    card?.classList.toggle("active-metric", !orphanResult.error && orphanCount > 0);
    card?.classList.toggle("metric-error", Boolean(orphanResult.error));
  });

  const errors = results.filter((result) => result.error);
  const activeReports = results[0].count || 0;
  const reviewingReports = results[1].count || 0;

  if (errors.length) {
    console.warn("Some board health queries failed:", errors.map((result) => result.error));
    adminHealthNote.textContent = `${errors.length} health metric${errors.length === 1 ? "" : "s"} could not be loaded. Check the console and Supabase policies.`;
  } else if (activeReports === 0) {
    adminHealthNote.textContent = "No active reports. The moderation queue is clear.";
  } else {
    adminHealthNote.textContent = `${activeReports} active report${activeReports === 1 ? "" : "s"}; ${reviewingReports} currently under review.`;
  }
}

async function cleanupOrphanImages() {
  if (currentProfile?.role !== "admin") return;
  const confirmed = window.confirm("Delete every unbound board image older than 24 hours? Attached images and moderation evidence will not be touched.");
  if (!confirmed) return;

  cleanOrphanImages.disabled = true;
  adminHealthNote.textContent = "Cleaning orphaned board images...";
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  try {
    const response = await fetch(BOARD_IMAGE_CLEANUP_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Image cleanup failed.");
    adminHealthNote.textContent = `Removed ${result.deleted} orphan image${result.deleted === 1 ? "" : "s"} and freed ${formatBytes(result.bytesFreed)}.${result.failed ? ` ${result.failed} item(s) require review.` : ""}`;
    await loadBoardHealth();
  } catch (error) {
    console.error("Board image cleanup failed:", error);
    adminHealthNote.textContent = error.message || "Image cleanup failed.";
  } finally {
    cleanOrphanImages.disabled = false;
  }
}

function reportStatusLabel(report, target) {
  if (target?.deleted_at) return "Content Deleted";
  return {
    open: "Open",
    reviewing: "Under Review",
    resolved: "Resolved",
    dismissed: "Dismissed"
  }[report.status] || report.status;
}

function attachAdminReportActions() {
  document.querySelectorAll(".admin-report-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-report-id]");
      const reportId = card?.dataset.reportId;
      const note = card?.querySelector(".admin-report-note")?.value.trim() || "";
      if (!reportId) return;
      await updateAdminReport(reportId, button.dataset.status, note);
    });
  });

  document.querySelectorAll(".manage-reported-user").forEach((button) => {
    button.addEventListener("click", () => {
      selectMemberForSanction({
        id: button.dataset.userId,
        display_name: button.dataset.displayName,
        username: button.dataset.username,
        role: button.dataset.role
      });
      sanctionForm.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function renderAdminReports(reports, profiles, threads, posts, categories) {
  if (!reports.length) {
    adminReportList.innerHTML = `<p class="admin-empty">No reports match this view.</p>`;
    return;
  }

  const profileMap = new Map(profiles.map((item) => [item.id, item]));
  const threadMap = new Map(threads.map((item) => [item.id, item]));
  const postMap = new Map(posts.map((item) => [item.id, item]));
  const categoryMap = new Map(categories.map((item) => [item.id, item]));

  adminReportList.innerHTML = reports.map((report) => {
    const reporter = profileMap.get(report.reporter_id) || {};
    const thread = report.thread_id ? threadMap.get(report.thread_id) : null;
    const post = report.post_id ? postMap.get(report.post_id) : null;
    const target = thread || post;
    const parentThread = thread || (post?.thread_id ? threadMap.get(post.thread_id) : null);
    const author = target?.author_id ? profileMap.get(target.author_id) || {} : {};
    const category = parentThread?.category_id ? categoryMap.get(parentThread.category_id) : null;
    const contentUrl = parentThread?.id && category?.slug
      ? `board.html?category=${encodeURIComponent(category.slug)}&thread=${encodeURIComponent(parentThread.id)}`
      : "";
    const statusLabel = reportStatusLabel(report, target);
    const targetTitle = thread ? `Thread: ${thread.title || "Deleted thread"}` : "Reply";
    const targetBody = target?.body || "The reported content is unavailable.";
    const canManageAuthor = author.id && author.id !== currentUser?.id && author.role !== "admin" && !(currentProfile?.role === "moderator" && author.role === "moderator");

    return `
      <article class="admin-report-card" data-report-id="${escapeHtml(report.id)}">
        <div class="admin-report-head">
          <div>
            <span class="admin-status ${escapeHtml(report.status)}">${escapeHtml(statusLabel)}</span>
            <h4>${escapeHtml(reportReasonLabels[report.reason] || report.reason)}</h4>
            <p>Reported by ${escapeHtml(getProfileName(reporter))} · ${escapeHtml(formatDate(report.created_at))}</p>
          </div>
          <code>${escapeHtml(report.id.slice(0, 8))}</code>
        </div>
        <div class="admin-report-target">
          <strong>${escapeHtml(targetTitle)}</strong>
          <span>Author: ${escapeHtml(getProfileName(author))}</span>
          <p>${escapeHtml(contentExcerpt(targetBody) || "Content unavailable.")}</p>
          ${contentUrl ? `<a href="${contentUrl}">Open reported content</a>` : ""}
        </div>
        ${report.details ? `<div class="admin-reporter-details"><strong>Reporter details</strong><p>${escapeHtml(report.details)}</p></div>` : ""}
        <label for="admin-report-note-${escapeHtml(report.id)}">Moderator note</label>
        <textarea class="admin-report-note" id="admin-report-note-${escapeHtml(report.id)}" maxlength="2000" placeholder="Record what was reviewed and why this action was taken.">${escapeHtml(report.resolution_note || "")}</textarea>
        <div class="admin-report-actions">
          ${canManageAuthor ? `<button class="btn manage-reported-user" type="button" data-user-id="${escapeHtml(author.id)}" data-display-name="${escapeHtml(author.display_name || "")}" data-username="${escapeHtml(author.username || "")}" data-role="${escapeHtml(author.role || "member")}">Manage User</button>` : ""}
          <button class="btn admin-report-action" type="button" data-status="reviewing">Mark Reviewing</button>
          <button class="btn primary admin-report-action" type="button" data-status="resolved">Resolve</button>
          <button class="btn admin-report-action" type="button" data-status="dismissed">Dismiss</button>
        </div>
      </article>
    `;
  }).join("");

  attachAdminReportActions();
}

async function loadAdminReports() {
  if (!isStaffProfile()) return;
  adminReportList.innerHTML = `<p class="admin-empty">Loading reports...</p>`;

  let query = supabase
    .from("board_reports")
    .select("id, reporter_id, thread_id, post_id, reason, details, status, resolution_note, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (adminReportFilter === "active") {
    query = query.in("status", ["open", "reviewing"]);
  } else if (adminReportFilter === "closed") {
    query = query.in("status", ["resolved", "dismissed"]);
  }

  const { data, error } = await query;
  const reports = data || [];

  if (error) {
    console.error("Admin report queue failed:", error);
    adminReportList.innerHTML = `<p class="admin-empty error">${escapeHtml(error.message || "Unable to load reports.")}</p>`;
    return;
  }

  const postIds = reports.map((item) => item.post_id).filter(Boolean);
  const postsResult = postIds.length
    ? await supabase.from("posts").select("id, body, thread_id, author_id, deleted_at").in("id", postIds)
    : { data: [] };
  const posts = postsResult.data || [];
  const threadIds = [...new Set([
    ...reports.map((item) => item.thread_id),
    ...posts.map((item) => item.thread_id)
  ].filter(Boolean))];
  const threadsResult = threadIds.length
    ? await supabase.from("threads").select("id, title, body, author_id, category_id, deleted_at").in("id", threadIds)
    : { data: [] };
  const threads = threadsResult.data || [];
  const profileIds = [...new Set([
    ...reports.map((item) => item.reporter_id),
    ...threads.map((item) => item.author_id),
    ...posts.map((item) => item.author_id)
  ].filter(Boolean))];
  const categoryIds = [...new Set(threads.map((item) => item.category_id).filter(Boolean))];
  const [profilesResult, categoriesResult] = await Promise.all([
    profileIds.length ? supabase.from("profiles").select("id, username, display_name, role").in("id", profileIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from("categories").select("id, slug, name").in("id", categoryIds) : Promise.resolve({ data: [] })
  ]);

  renderAdminReports(reports, profilesResult.data || [], threads, posts, categoriesResult.data || []);
}

async function updateAdminReport(reportId, status, note) {
  if (!isStaffProfile()) return;
  document.querySelectorAll(`[data-report-id="${CSS.escape(reportId)}"] .admin-report-action`).forEach((button) => {
    button.disabled = true;
  });

  const { error } = await supabase
    .from("board_reports")
    .update({ status, resolution_note: note })
    .eq("id", reportId);

  if (error) {
    console.error("Report update failed:", error);
    adminHealthNote.textContent = error.message || "The moderation action failed.";
    await loadAdminReports();
    return;
  }

  await Promise.all([loadBoardHealth(), loadAdminReports()]);
}

function updateSanctionDurationState() {
  if (!sanctionType || !sanctionDuration) return;
  const warning = sanctionType.value === "warning";
  const ban = sanctionType.value === "ban";
  if (ban) sanctionDuration.value = "permanent";
  sanctionDuration.disabled = warning || ban;
}

function selectMemberForSanction(profile) {
  selectedSanctionTarget = profile;
  sanctionForm.hidden = false;
  sanctionTarget.textContent = `${getProfileName(profile)}${profile.username ? ` (@${profile.username})` : ""} · ${profile.role || "member"}`;
  sanctionPublicReason.value = "";
  sanctionPrivateNote.value = "";
  sanctionStatus.textContent = "Ready to document an enforcement action.";
  memberSearchResults.hidden = true;
  sanctionType.focus();
}

async function searchMembers() {
  if (!isStaffProfile()) return;
  const term = memberSearchInput.value.trim();

  if (term.length < 2) {
    memberSearchResults.hidden = false;
    memberSearchResults.innerHTML = `<p class="admin-empty">Enter at least two characters.</p>`;
    return;
  }

  memberSearchButton.disabled = true;
  memberSearchResults.hidden = false;
  memberSearchResults.innerHTML = `<p class="admin-empty">Searching members...</p>`;

  const [displayResult, usernameResult] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, role").ilike("display_name", `%${term}%`).limit(12),
    supabase.from("profiles").select("id, username, display_name, role").ilike("username", `%${term}%`).limit(12)
  ]);
  memberSearchButton.disabled = false;

  if (displayResult.error && usernameResult.error) {
    memberSearchResults.innerHTML = `<p class="admin-empty error">Member search failed.</p>`;
    return;
  }

  const members = [...new Map([
    ...(displayResult.data || []),
    ...(usernameResult.data || [])
  ].map((item) => [item.id, item])).values()].slice(0, 12);

  if (!members.length) {
    memberSearchResults.innerHTML = `<p class="admin-empty">No matching members.</p>`;
    return;
  }

  memberSearchResults.innerHTML = members.map((profile) => {
    const protectedAccount = profile.id === currentUser?.id || profile.role === "admin" || (currentProfile?.role === "moderator" && profile.role === "moderator");
    return `
      <button class="member-result" type="button" data-user-id="${escapeHtml(profile.id)}" ${protectedAccount ? "disabled" : ""}>
        <strong>${escapeHtml(getProfileName(profile))}</strong>
        <span>${profile.username ? `@${escapeHtml(profile.username)} · ` : ""}${escapeHtml(profile.role || "member")}${protectedAccount ? " · Protected" : ""}</span>
      </button>
    `;
  }).join("");

  memberSearchResults.querySelectorAll(".member-result:not(:disabled)").forEach((button) => {
    button.addEventListener("click", () => {
      const profile = members.find((item) => item.id === button.dataset.userId);
      if (profile) selectMemberForSanction(profile);
    });
  });
}

async function submitSanction(event) {
  event.preventDefault();
  if (!isStaffProfile() || !selectedSanctionTarget) return;

  const type = sanctionType.value;
  const durationValue = sanctionDuration.value;
  const publicReason = sanctionPublicReason.value.trim();
  const privateNote = sanctionPrivateNote.value.trim();

  if (publicReason.length < 3) {
    sanctionStatus.textContent = "Enter a clear public reason of at least three characters.";
    return;
  }

  if (["mute", "suspension"].includes(type) && durationValue === "permanent") {
    sanctionStatus.textContent = "Mutes and suspensions require an expiration. Use Ban for a permanent restriction.";
    return;
  }

  const durationMinutes = type === "warning" || type === "ban" || durationValue === "permanent"
    ? null
    : Number.parseInt(durationValue, 10);

  applySanction.disabled = true;
  sanctionStatus.textContent = "Applying action...";

  const { error } = await supabase.rpc("issue_board_sanction", {
    target_user_id: selectedSanctionTarget.id,
    requested_type: type,
    public_reason: publicReason,
    private_note: privateNote,
    duration_minutes: durationMinutes
  });

  if (error) {
    console.error("Sanction failed:", error);
    sanctionStatus.textContent = error.message || "The action could not be applied.";
    applySanction.disabled = false;
    return;
  }

  sanctionStatus.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} applied to ${getProfileName(selectedSanctionTarget)}.`;
  applySanction.disabled = false;
  sanctionPublicReason.value = "";
  sanctionPrivateNote.value = "";
  await loadSanctionHistory();
}

async function revokeSanction(sanctionId) {
  if (!isStaffProfile()) return;
  const reason = window.prompt("Reason for lifting this action:", "Restriction lifted by staff.");
  if (reason === null) return;

  const { error } = await supabase.rpc("revoke_board_sanction", {
    target_sanction_id: sanctionId,
    revocation_reason: reason.trim() || "Restriction lifted by staff."
  });

  if (error) {
    console.error("Sanction revocation failed:", error);
    adminHealthNote.textContent = error.message || "The restriction could not be lifted.";
    return;
  }

  await loadSanctionHistory();
}

async function loadSanctionHistory() {
  if (!isStaffProfile()) return;
  sanctionHistory.innerHTML = `<p class="admin-empty">Loading enforcement history...</p>`;

  const { data, error } = await supabase
    .from("board_sanctions")
    .select("id, user_id, sanction_type, reason_public, note_private, issued_by, starts_at, expires_at, active, acknowledged_at, revoked_at, revoked_by, revoke_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Sanction history failed:", error);
    sanctionHistory.innerHTML = `<p class="admin-empty error">${escapeHtml(error.message || "Unable to load enforcement history.")}</p>`;
    return;
  }

  const sanctions = data || [];
  if (!sanctions.length) {
    sanctionHistory.innerHTML = `<p class="admin-empty">No enforcement actions have been recorded.</p>`;
    return;
  }

  const profileIds = [...new Set(sanctions.flatMap((item) => [item.user_id, item.issued_by, item.revoked_by]).filter(Boolean))];
  const profilesResult = await supabase.from("profiles").select("id, username, display_name, role").in("id", profileIds);
  const profileMap = new Map((profilesResult.data || []).map((item) => [item.id, item]));
  const now = Date.now();

  sanctionHistory.innerHTML = sanctions.map((sanction) => {
    const target = profileMap.get(sanction.user_id) || {};
    const issuer = profileMap.get(sanction.issued_by) || {};
    const isExpired = sanction.expires_at && new Date(sanction.expires_at).getTime() <= now;
    const currentlyActive = sanction.active && !isExpired;
    const state = currentlyActive ? "Active" : sanction.acknowledged_at ? "Acknowledged" : isExpired ? "Expired" : "Revoked";
    const expiry = sanction.expires_at ? formatDate(sanction.expires_at) : sanction.sanction_type === "ban" ? "Permanent" : "No expiration";

    return `
      <article class="sanction-history-card">
        <div>
          <span class="admin-status ${currentlyActive ? "open" : "resolved"}">${escapeHtml(state)}</span>
          <h5>${escapeHtml(sanction.sanction_type)} · ${escapeHtml(getProfileName(target))}</h5>
          <p>${escapeHtml(sanction.reason_public)}</p>
          <small>Issued by ${escapeHtml(getProfileName(issuer))} · ${escapeHtml(formatDate(sanction.created_at))} · ${escapeHtml(expiry)}</small>
          ${sanction.note_private ? `<details><summary>Private staff note</summary><p>${escapeHtml(sanction.note_private)}</p></details>` : ""}
          ${sanction.revoke_reason ? `<p class="sanction-revoked">${escapeHtml(sanction.revoke_reason)}</p>` : ""}
        </div>
        ${currentlyActive ? `<button class="btn revoke-sanction" type="button" data-sanction-id="${escapeHtml(sanction.id)}">Lift Action</button>` : ""}
      </article>
    `;
  }).join("");

  sanctionHistory.querySelectorAll(".revoke-sanction").forEach((button) => {
    button.addEventListener("click", () => revokeSanction(button.dataset.sanctionId));
  });
}

async function loadAdminDashboard() {
  if (!isStaffProfile()) return;
  if (refreshAdminDashboard) refreshAdminDashboard.disabled = true;
  await Promise.all([loadBoardHealth(), loadAdminReports(), loadSanctionHistory()]);
  if (refreshAdminDashboard) refreshAdminDashboard.disabled = false;
}

function updateDeleteButtonState() {
  if (!deleteConfirmInput || !deleteProfile) return;

  deleteProfile.disabled = deleteConfirmInput.value.trim() !== "DELETE" || !currentUser;
}

async function deleteBoardProfile() {
  if (!currentUser) {
    profileStatus.textContent = "Sign in before deleting your account.";
    return;
  }

  if (currentProfile?.role === "admin") {
    profileStatus.textContent = "Administrator accounts cannot be deleted from the profile page.";
    return;
  }

  if (!deleteConfirmInput || deleteConfirmInput.value.trim() !== "DELETE") {
    profileStatus.textContent = "Type DELETE before deleting your account.";
    return;
  }

  const confirmed = window.confirm(
    "Delete your SoftSin account? This deletes your Supabase login and anonymizes your board profile as Deleted member. Existing posts stay visible. This cannot be undone from this page."
  );

  if (!confirmed) return;

  deleteProfile.disabled = true;
  saveProfile.disabled = true;
  profileStatus.textContent = "Deleting account...";

  const { data, error } = await supabase.functions.invoke("delete-user-function", {
    method: "POST"
  });

  if (error || !data?.ok) {
    console.error("Account delete failed:", error || data);
    profileStatus.textContent = data?.error || error?.message || "Account delete failed.";
    saveProfile.disabled = false;
    updateDeleteButtonState();
    return;
  }

  profileStatus.textContent = "Account deleted. Signing out...";

  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    console.error("Sign out after account delete failed:", signOutError);
  }

  currentUser = null;
  currentProfile = null;
  setSignedOut();
  window.location.href = "board.html";
}

if (loginDiscord) {
  loginDiscord.addEventListener("click", signInWithDiscord);
}

if (logout) {
  logout.addEventListener("click", signOut);
}

if (deleteConfirmInput) {
  deleteConfirmInput.addEventListener("input", updateDeleteButtonState);
}

if (deleteProfile) {
  deleteProfile.addEventListener("click", deleteBoardProfile);
}

if (profileForm) {
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfileChanges();
  });
}

if (refreshAdminDashboard) {
  refreshAdminDashboard.addEventListener("click", loadAdminDashboard);
}

if (cleanOrphanImages) {
  cleanOrphanImages.addEventListener("click", cleanupOrphanImages);
}

adminReportFilters.forEach((button) => {
  button.addEventListener("click", async () => {
    adminReportFilter = button.dataset.filter || "active";
    adminReportFilters.forEach((item) => item.classList.toggle("active", item === button));
    await loadAdminReports();
  });
});

if (memberSearchButton) {
  memberSearchButton.addEventListener("click", searchMembers);
}

if (memberSearchInput) {
  memberSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchMembers();
    }
  });
}

if (sanctionType) {
  sanctionType.addEventListener("change", updateSanctionDurationState);
  updateSanctionDurationState();
}

if (sanctionForm) {
  sanctionForm.addEventListener("submit", submitSanction);
}

if (refreshSanctions) {
  refreshSanctions.addEventListener("click", loadSanctionHistory);
}

supabase.auth.onAuthStateChange(() => {
  clearAuthCredentialsFromUrl();
  refreshSession();
});

clearAuthCredentialsFromUrl();
refreshSession();
