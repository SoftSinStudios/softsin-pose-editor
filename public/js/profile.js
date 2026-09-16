import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pnpijueflzvlyzzmhdwa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ts2QrwDwmmIrXbSzG14fBQ_REyHdGS5";

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

let currentUser = null;
let currentProfile = null;
let adminReportFilter = "active";

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
  element.textContent = result?.error ? "!" : new Intl.NumberFormat().format(result?.count || 0);
}

async function loadBoardHealth() {
  if (!isStaffProfile()) return;

  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
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
    supabase.from("posts").select("id", { count: "exact", head: true }).gte("deleted_at", weekAgo)
  ]);

  setStat(statActiveReports, results[0]);
  setStat(statReviewingReports, results[1]);
  setStat(statThreadsDay, results[2]);
  setStat(statRepliesDay, results[3]);
  setStat(statMembersWeek, results[4]);
  setStat(statLockedThreads, results[5]);
  setStat(statReportsClosedWeek, results[6]);

  const removedHasError = results[7].error || results[8].error;
  statRemovedWeek.textContent = removedHasError
    ? "!"
    : new Intl.NumberFormat().format((results[7].count || 0) + (results[8].count || 0));

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

async function loadAdminDashboard() {
  if (!isStaffProfile()) return;
  if (refreshAdminDashboard) refreshAdminDashboard.disabled = true;
  await Promise.all([loadBoardHealth(), loadAdminReports()]);
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

adminReportFilters.forEach((button) => {
  button.addEventListener("click", async () => {
    adminReportFilter = button.dataset.filter || "active";
    adminReportFilters.forEach((item) => item.classList.toggle("active", item === button));
    await loadAdminReports();
  });
});

supabase.auth.onAuthStateChange(() => {
  clearAuthCredentialsFromUrl();
  refreshSession();
});

clearAuthCredentialsFromUrl();
refreshSession();
