import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pnpijueflzvlyzzmhdwa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ts2QrwDwmmIrXbSzG14fBQ_REyHdGS5";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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

let currentUser = null;
let currentProfile = null;

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
    ...profilePayload,
    role: currentProfile?.role || "member"
  };

  renderProfile(currentUser, currentProfile);

  profileStatus.textContent = "Profile saved.";
  saveProfile.disabled = false;
}

if (loginDiscord) {
  loginDiscord.addEventListener("click", signInWithDiscord);
}

if (logout) {
  logout.addEventListener("click", signOut);
}

if (profileForm) {
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfileChanges();
  });
}

supabase.auth.onAuthStateChange(() => {
  refreshSession();
});

refreshSession();