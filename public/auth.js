const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");
const phoneInput = document.getElementById("phoneInput");
const nameInput = document.getElementById("nameInput");
let requestedName = "";
const otpInput = document.getElementById("otpInput");
const otpArea = document.getElementById("otpArea");
const authMessage = document.getElementById("authMessage");
const demoHint = document.getElementById("demoHint");
const authMode = document.getElementById("authMode");
const authModeHelp = document.getElementById("authModeHelp");
let activeAuthMode = "demo";
let serverConfig = {};
let requestedPhone = "";

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options, credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function authStatus(message, error = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", error);
}
async function checkSession() {
  try {
    const config = await api("/api/config");
    if (config.user) showApp(config.user);
    else showAuth(config);
  } catch {
    showAuth({ demoMode: true });
    authStatus("Could not connect to the server. Start it with npm start.", true);
  }
}
function showAuth(config = {}) {
  serverConfig = config;
  authScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
  authMode.value = "demo";
  updateAuthModeHelp();
  demoHint.textContent = "Choose a verification method above. Real SMS requires a configured provider and may not be free.";
}
function updateAuthModeHelp() {
  activeAuthMode = authMode.value;
  if (activeAuthMode === "demo") {
    authModeHelp.textContent = "Free for local testing. Use code 123456; no message is sent to your phone.";
  } else if (serverConfig.smsOtpConfigured) {
    authModeHelp.textContent = "SMS provider is configured. A real SMS will be requested; provider trial limits or charges may apply.";
  } else {
    authModeHelp.textContent = "Real SMS is not configured yet. Add valid Twilio Verify credentials to .env. Selecting this option alone cannot send SMS or make it free.";
  }
}
authMode.addEventListener("change", updateAuthModeHelp);
function showApp(user) {
  window.civicPulseUser = user || null;
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  const displayName = user.name || "Citizen";
  document.getElementById("topUserName").textContent = displayName;
  const initials = displayName.trim().split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase() || "CP";
  document.querySelectorAll(".profile-chip .avatar").forEach(el => el.textContent = initials);
  document.getElementById("assistantFab")?.classList.remove("hidden");
  document.getElementById("profileInfo").innerHTML = `<div class="profile-details"><div><small>Display name</small><b>${escapeHtml(user.name || "Citizen")}</b></div><div><small>Verified mobile</small><b>${escapeHtml(user.phone || "")}</b></div><div><small>Account type</small><b>Citizen account</b></div></div>`;
  if (window.CivicPulse) window.CivicPulse.init();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
document.getElementById("sendOtpBtn").addEventListener("click", async () => {
  requestedName = nameInput.value.trim();
  requestedPhone = phoneInput.value.trim();
  if (requestedName.length < 2) { authStatus("Please enter your full name (at least 2 characters).", true); nameInput.focus(); return; }
  authStatus("Requesting OTP…");
  try {
    const result = await api("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ phone: requestedPhone, name: requestedName, mode: activeAuthMode }) });
    otpArea.classList.remove("hidden");
    phoneInput.readOnly = true;
    authMode.disabled = true;
    document.getElementById("sendOtpBtn").classList.add("hidden");
    authStatus(result.message);
    demoHint.textContent = result.demo ? `Demo code: ${result.demoCode} (no SMS was sent).` : "Check your phone's SMS inbox/notifications.";
    otpInput.focus();
  } catch (err) { authStatus(err.message, true); }
});
document.getElementById("verifyOtpBtn").addEventListener("click", async () => {
  authStatus("Verifying code…");
  try {
    const result = await api("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone: requestedPhone, name: requestedName, code: otpInput.value.trim() }) });
    authStatus("");
    showApp(result.user);
  } catch (err) { authStatus(err.message, true); }
});
document.getElementById("changePhoneBtn").addEventListener("click", () => {
  otpArea.classList.add("hidden");
  document.getElementById("sendOtpBtn").classList.remove("hidden");
  document.getElementById("sendOtpBtn").classList.remove("hidden");
  phoneInput.readOnly = false;
  authMode.disabled = false;
  otpInput.value = "";
  authStatus("");
});
async function logout() {
  try { await api("/api/auth/logout", { method: "POST", body: "{}" }); } catch {}
  location.reload();
}
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("profileLogoutBtn").addEventListener("click", logout);
window.CivicAuth = { get currentUser(){ return window.civicPulseUser || null; }, api, showApp, checkSession, escapeHtml };
checkSession();