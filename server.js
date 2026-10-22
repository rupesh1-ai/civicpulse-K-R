require("dotenv").config();
const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const twilio = require("twilio");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const demoMode = process.env.DEMO_MODE !== "false";
const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID;
const hasOpenAI = !!process.env.OPENAI_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-development-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 8 }
}));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use(express.static("public"));

const twilioClient = hasTwilio ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;
const dataDir = path.join(__dirname, "data");
const issuesFile = path.join(dataDir, "issues.json");
const seedIssues = [
  { id: "CP-1001", title: "Pothole near Main Road", category: "Roads", description: "A large pothole is affecting two-wheelers near the bus stop. Please inspect and repair the road surface.", location: "Main Road, Ward 4", lat: 31.3260, lng: 75.5762, status: "In progress", priority: "High", reportedAt: "Sample data", sample: true },
  { id: "CP-1002", title: "Overflowing community bin", category: "Waste", description: "The public bin is full and waste is spilling onto the footpath.", location: "Green Park entrance, Ward 2", lat: 31.3290, lng: 75.5810, status: "Reported", priority: "Medium", reportedAt: "Sample data", sample: true },
  { id: "CP-1003", title: "Streetlight not working", category: "Electricity", description: "The streetlight at the corner has not worked for three nights.", location: "Market Street, Ward 6", lat: 31.3220, lng: 75.5700, status: "Resolved", priority: "Low", reportedAt: "Sample data", sample: true }
];
function readIssues() {
  try { if (fs.existsSync(issuesFile)) return JSON.parse(fs.readFileSync(issuesFile, "utf8")); } catch (err) { console.error("Could not read issue store:", err.message); }
  return [...seedIssues];
}
function saveIssues() {
  try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(issuesFile, JSON.stringify(issues, null, 2)); }
  catch (err) { console.error("Could not persist issues:", err.message); }
}
const issues = readIssues();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Please sign in first." });
  next();
}

app.get("/api/config", (req, res) => res.json({
  demoMode, smsOtpConfigured: !!hasTwilio, aiConfigured: hasOpenAI,
  user: req.session.user || null
}));

app.post("/api/auth/send-otp", async (req, res) => {
  const phone = String(req.body.phone || "").trim();
  const name = String(req.body.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const mode = req.body.mode === "sms" ? "sms" : "demo";
  if (name.length < 2) return res.status(400).json({ error: "Enter your full name (at least 2 characters)." });
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return res.status(400).json({ error: "Enter a valid phone number with country code, e.g. +919876543210." });
  }
  try {
    req.session.pendingName = name;
    req.session.authMode = mode;
    if (mode === "sms" && !hasTwilio) {
      return res.status(503).json({ error: "Real SMS is not configured. To use SMS, configure Twilio Verify credentials in .env. A provider may charge after trial limits; this option cannot guarantee free SMS." });
    }
    if (mode === "sms" && hasTwilio) {
      const result = await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: phone, channel: "sms" });
      return res.json({ ok: true, message: `Verification SMS requested (${result.status}). Check the SMS notifications on ${phone}.`, demo: false });
    }
    if (mode === "demo") {
      req.session.demoOtp = "123456";
      req.session.demoPhone = phone;
      return res.json({ ok: true, message: "Demo mode only: no SMS was sent. Use demo code 123456.", demo: true, demoCode: "123456" });
    }
    return res.status(503).json({ error: "SMS OTP is not configured. Add Twilio Verify credentials to .env." });
  } catch (err) {
    console.error("OTP send error:", err.message);
    return res.status(502).json({ error: "Could not send SMS. Check the phone number, Twilio Verify setup, and account status." });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const phone = String(req.body.phone || "").trim();
  const suppliedName = String(req.body.name || req.session.pendingName || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const code = String(req.body.code || "").trim();
  if (suppliedName.length < 2) return res.status(400).json({ error: "Please enter your full name before verifying." });
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || !/^\d{4,8}$/.test(code)) {
    return res.status(400).json({ error: "Enter the same phone number and the OTP you received." });
  }
  try {
    let approved = false;
    if (req.session.authMode === "sms" && hasTwilio) {
      const result = await twilioClient.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: phone, code });
      approved = result.status === "approved";
    } else if (req.session.authMode === "demo") {
      approved = phone === req.session.demoPhone && code === req.session.demoOtp && code === "123456";
    } else {
      return res.status(503).json({ error: "SMS OTP is not configured." });
    }
    if (!approved) return res.status(400).json({ error: "OTP is incorrect or expired. Try again." });
    req.session.user = { phone, name: suppliedName, signedInAt: new Date().toISOString() };
    delete req.session.pendingName;
    delete req.session.demoOtp;
    delete req.session.demoPhone;
    delete req.session.authMode;
    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error("OTP verify error:", err.message);
    res.status(502).json({ error: "Could not verify OTP. Check your provider configuration and try again." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/issues", requireAuth, (req, res) => res.json({ issues }));
app.post("/api/issues", requireAuth, (req, res) => {
  const { title, category, description, location, lat, lng } = req.body;
  if (!title || !category || !description || !location) return res.status(400).json({ error: "Complete all required fields." });
  const item = {
    id: `CP-${String(Math.max(1003, ...issues.map(i => Number(String(i.id).replace(/\D/g, "")) || 1003) ) + 1)}`, title: String(title).slice(0, 100), category: String(category).slice(0, 40),
    description: String(description).slice(0, 1200), location: String(location).slice(0, 180),
    lat: Number(lat) || 31.3260, lng: Number(lng) || 75.5762, status: "Reported", priority: "Medium",
    reportedAt: new Date().toLocaleString(), sample: false, reportedBy: req.session.user.phone
  };
  issues.unshift(item);
  saveIssues();
  res.status(201).json({ issue: item });
});


app.patch("/api/issues/:id/status", requireAuth, (req, res) => {
  const item = issues.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Issue not found." });
  if (item.sample || item.reportedBy !== req.session.user.phone) {
    return res.status(403).json({ error: "Only the citizen who submitted this report can update its progress in this demo." });
  }
  const status = String(req.body.status || "");
  if (!["Reported", "In progress", "Resolved"].includes(status)) return res.status(400).json({ error: "Choose a valid status." });
  item.status = status;
  item.updatedAt = new Date().toLocaleString();
  saveIssues();
  res.json({ issue: item });
});

app.get("/api/my-reports", requireAuth, (req, res) => {
  const mine = issues.filter(i => !i.sample && i.reportedBy === req.session.user.phone);
  res.json({ issues: mine });
});

app.post("/api/assistant", requireAuth, async (req, res) => {
  const question = String(req.body.message || "").trim().slice(0, 1500);
  if (!question) return res.status(400).json({ error: "Enter a question." });
  if (!hasOpenAI) {
    return res.json({ answer: "I'm the CivicPulse demo assistant. I can guide you through reporting potholes, garbage, water leakage, streetlights, and tracking a civic complaint. For urgent danger, use the verified emergency contact shown in the app. AI service is not configured yet, so this is a built-in guidance response." });
  }
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are CivicPulse Assistant, a concise and careful civic-services helper. Help users understand how to report local infrastructure issues, track complaints, and use the CivicPulse app. Do not invent official phone numbers, claim to submit complaints on behalf of the user, or give unverified emergency instructions. For immediate danger, tell users to contact their local official emergency service." },
          { role: "user", content: question }
        ],
        temperature: 0.3
      })
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const data = await response.json();
    res.json({ answer: data.choices?.[0]?.message?.content || "Sorry, I could not prepare an answer." });
  } catch (err) {
    console.error("Assistant error:", err.message);
    res.status(502).json({ error: "AI assistant is temporarily unavailable. Check the API configuration." });
  }
});

app.get("*", (req, res) => res.sendFile(require("path").join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`CivicPulse running at http://localhost:${PORT} | SMS configured: ${!!hasTwilio} | AI configured: ${hasOpenAI}`));
