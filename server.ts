import express, { type Request } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

type FileUploadRequest = Request & {
  file?: Express.Multer.File;
};

const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, "uploads/");
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const db = new Database("agency.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'artist',
    bank_info TEXT,
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    profile_image TEXT,
    whatsapp_enabled INTEGER DEFAULT 0,
    whatsapp_number TEXT,
    google_id TEXT,
    is_existing_user INTEGER DEFAULT 0,
    spotify_profile_link TEXT
  );

  CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    logo_svg TEXT,
    logo_url TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT,
    status TEXT DEFAULT 'open',
    is_admin_read INTEGER DEFAULT 0,
    is_user_read INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    sender_id INTEGER,
    message TEXT,
    file_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER,
    title TEXT,
    title_version TEXT,
    genre TEXT,
    metadata_language TEXT,
    is_previously_released INTEGER DEFAULT 0,
    original_release_date TEXT,
    price_code_general TEXT,
    price_code_itunes TEXT,
    artwork_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    release_date TEXT,
    stores TEXT,
    territories TEXT,
    territory_exclusion INTEGER DEFAULT 0,
    description TEXT,
    platform_links TEXT,
    admin_remarks TEXT,
    FOREIGN KEY(artist_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER,
    title TEXT,
    title_version TEXT,
    metadata_language TEXT,
    audio_language TEXT,
    origin TEXT,
    price_code TEXT,
    price_code_itunes TEXT,
    is_explicit INTEGER DEFAULT 0,
    file_url TEXT,
    type TEXT,
    artist_name TEXT,
    composer TEXT,
    contributors TEXT,
    FOREIGN KEY(release_id) REFERENCES releases(id)
  );

  CREATE TABLE IF NOT EXISTS revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER,
    release_id INTEGER,
    amount REAL,
    platform TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(artist_id) REFERENCES users(id),
    FOREIGN KEY(release_id) REFERENCES releases(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER,
    amount REAL,
    status TEXT DEFAULT 'pending',
    payout_screenshot TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(artist_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT,
    type TEXT,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS agreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER,
    artist_share INTEGER DEFAULT 50,
    label_share INTEGER DEFAULT 50,
    status TEXT DEFAULT 'draft',
    agreement_html TEXT,
    signature_data_url TEXT,
    sent_at DATETIME,
    signed_at DATETIME,
    verified_at DATETIME,
    verified_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(artist_id) REFERENCES users(id),
    FOREIGN KEY(verified_by) REFERENCES users(id)
  );
`);

const userColumns = new Set<string>(
  (db.prepare("PRAGMA table_info(users)").all() as any[]).map((c) => String(c.name))
);
const addUserColumn = (name: string, ddl: string) => {
  if (userColumns.has(name)) return;
  db.exec(ddl);
  userColumns.add(name);
};
addUserColumn("distributed_before", "ALTER TABLE users ADD COLUMN distributed_before INTEGER");
addUserColumn("upcoming_audio_url", "ALTER TABLE users ADD COLUMN upcoming_audio_url TEXT");
addUserColumn("legal_name", "ALTER TABLE users ADD COLUMN legal_name TEXT");
addUserColumn("legal_address", "ALTER TABLE users ADD COLUMN legal_address TEXT");
addUserColumn("country", "ALTER TABLE users ADD COLUMN country TEXT");
addUserColumn("phone_number", "ALTER TABLE users ADD COLUMN phone_number TEXT");
addUserColumn("aadhaar_number", "ALTER TABLE users ADD COLUMN aadhaar_number TEXT");
addUserColumn("id_card_url", "ALTER TABLE users ADD COLUMN id_card_url TEXT");

const USER_SELECT_FIELDS =
  "id, email, name, role, bank_info, balance, whatsapp_enabled, whatsapp_number, profile_image, status, is_existing_user, spotify_profile_link, distributed_before, upcoming_audio_url, legal_name, legal_address, country, phone_number, aadhaar_number, id_card_url";

const platformCount = (db.prepare("SELECT COUNT(*) as count FROM platforms").get() as any).count;
if (platformCount === 0) {
  const defaultPlatforms = [
    { name: "Spotify", logo_url: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" },
    { name: "Apple Music", logo_url: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Apple_Music_logo.svg" },
    { name: "YouTube Music", logo_url: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Youtube_Music_logo.svg" },
    { name: "Amazon Music", logo_url: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Amazon_Music_logo.svg" },
    { name: "Deezer", logo_url: "https://upload.wikimedia.org/wikipedia/commons/d/db/Deezer_logo.svg" },
    { name: "Tidal", logo_url: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Tidal_logo.svg" },
  ];
  const insert = db.prepare("INSERT INTO platforms (name, logo_url) VALUES (?, ?)");
  defaultPlatforms.forEach((p) => insert.run(p.name, p.logo_url));
}

const defaultSettings = [
  { key: "app_name", value: "SonicStream" },
  { key: "app_logo_url", value: "" },
  { key: "brand_primary", value: "#8B5CF6" },
  { key: "brand_secondary", value: "#EC4899" },
  { key: "brand_accent", value: "#06B6D4" },
  { key: "app_bg_color", value: "#030014" },
  { key: "glass_card_bg", value: "rgba(255, 255, 255, 0.05)" },
  { key: "glass_card_border", value: "rgba(255, 255, 255, 0.1)" },
  { key: "border_radius", value: "2rem" },
  { key: "theme_presets", value: "" },
  { key: "theme_mode", value: "dark" },
];
const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
defaultSettings.forEach((s) => insertSetting.run(s.key, s.value));

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

const googleOAuthStates = new Map<string, number>();

const getRequestBaseUrl = (req: express.Request) => {
  const proto = req.headers["x-forwarded-proto"] ? String(req.headers["x-forwarded-proto"]).split(",")[0].trim() : req.protocol;
  const host = req.headers["x-forwarded-host"] ? String(req.headers["x-forwarded-host"]).split(",")[0].trim() : req.get("host");
  return `${proto}://${host}`;
};

app.get("/api/settings", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all() as any[];
  const obj: any = {};
  rows.forEach((r) => (obj[r.key] = r.value));
  res.json(obj);
});

app.get("/api/platforms", (req, res) => {
  const platforms = db.prepare("SELECT * FROM platforms WHERE is_active = 1").all();
  res.json(platforms);
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  const r = req as FileUploadRequest;
  if (!r.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: `/uploads/${r.file.filename}` });
});

app.post("/api/register", (req, res) => {
  const { email, password, name, is_existing_user, spotify_profile_link } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: "Missing fields" });
  if (is_existing_user && !spotify_profile_link) return res.status(400).json({ error: "Spotify profile link is required" });

  try {
    const stmt = db.prepare(
      "INSERT INTO users (email, password, name, role, status, balance, is_existing_user, spotify_profile_link) VALUES (?, ?, ?, 'artist', 'onboarding', 0, ?, ?)"
    );
    stmt.run(email, password, name, is_existing_user ? 1 : 0, spotify_profile_link || "");
    const user = db.prepare(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE email = ? ORDER BY id DESC LIMIT 1`).get(email);
    res.json({ user });
  } catch {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });
  const user = db
    .prepare(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE email = ? AND password = ?`)
    .get(email, password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  res.json(user);
});

app.get("/api/auth/google/url", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getRequestBaseUrl(req)}/api/auth/google/callback`;
  if (!clientId) return res.status(500).json({ error: "Google OAuth is not configured" });

  const state = crypto.randomBytes(16).toString("hex");
  googleOAuthStates.set(state, Date.now() + 10 * 60 * 1000);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent",
  });

  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");

  const expiry = googleOAuthStates.get(state);
  googleOAuthStates.delete(state);
  if (!code || !expiry || expiry < Date.now()) {
    res.status(400).send(
      `<html><body><script>
      window.opener && window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Invalid OAuth state' }, '*');
      window.close();
      </script></body></html>`
    );
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getRequestBaseUrl(req)}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    res.status(500).send(
      `<html><body><script>
      window.opener && window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Google OAuth is not configured' }, '*');
      window.close();
      </script></body></html>`
    );
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenJson = (await tokenRes.json()) as any;
    if (!tokenRes.ok) {
      const errMsg = tokenJson?.error_description || tokenJson?.error || "Failed to exchange OAuth token";
      res.status(400).send(
        `<html><body><script>
        window.opener && window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errMsg)} }, '*');
        window.close();
        </script></body></html>`
      );
      return;
    }

    const accessToken = String(tokenJson.access_token || "");
    if (!accessToken) throw new Error("Missing access token");

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = (await userInfoRes.json()) as any;
    if (!userInfoRes.ok) throw new Error(userInfo?.error?.message || "Failed to fetch Google profile");

    const email = String(userInfo.email || "");
    const name = String(userInfo.name || userInfo.given_name || "Artist");
    const googleId = String(userInfo.sub || "");
    const profileImage = String(userInfo.picture || "");
    if (!email || !googleId) throw new Error("Google profile is missing required fields");

    const existingByGoogleId = db.prepare("SELECT id FROM users WHERE google_id = ?").get(googleId) as any;
    const existingByEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;

    if (existingByGoogleId?.id) {
      db.prepare("UPDATE users SET email = ?, name = COALESCE(NULLIF(name,''), ?), profile_image = COALESCE(NULLIF(profile_image,''), ?) WHERE id = ?").run(
        email,
        name,
        profileImage,
        existingByGoogleId.id
      );
    } else if (existingByEmail?.id) {
      db.prepare("UPDATE users SET google_id = ?, profile_image = COALESCE(NULLIF(profile_image,''), ?) WHERE id = ?").run(
        googleId,
        profileImage,
        existingByEmail.id
      );
    } else {
      db.prepare(
        "INSERT INTO users (email, password, name, role, status, balance, google_id, profile_image) VALUES (?, ?, ?, 'artist', 'onboarding', 0, ?, ?)"
      ).run(email, "", name, googleId, profileImage);
    }

    const user = db
      .prepare(
        `SELECT ${USER_SELECT_FIELDS} FROM users WHERE google_id = ? OR email = ? ORDER BY id DESC LIMIT 1`
      )
      .get(googleId, email);

    res.status(200).send(
      `<html><body><script>
      window.opener && window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: ${JSON.stringify(user)} }, '*');
      window.close();
      </script></body></html>`
    );
  } catch (e: any) {
    const msg = e?.message || "Google login failed";
    res.status(500).send(
      `<html><body><script>
      window.opener && window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
      window.close();
      </script></body></html>`
    );
  }
});

app.get("/api/artist/releases", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  const releases = db.prepare("SELECT * FROM releases WHERE artist_id = ? ORDER BY created_at DESC").all(userId);
  res.json(releases);
});

app.post("/api/artist/onboarding", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { distributed_before, upcoming_audio_url } = req.body || {};
  const dist = distributed_before === null || distributed_before === undefined ? null : Number(distributed_before) ? 1 : 0;
  const upcoming = upcoming_audio_url ? String(upcoming_audio_url) : null;

  db.prepare("UPDATE users SET distributed_before = ?, upcoming_audio_url = ? WHERE id = ?").run(dist, upcoming, userId);
  const user = db.prepare(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = ?`).get(userId);
  res.json({ user });
});

app.post("/api/artist/onboarding/complete", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { legal_name, legal_address, country, phone_number, aadhaar_number, id_card_url } = req.body || {};
  if (!legal_name || !legal_address || !country || !phone_number || !aadhaar_number || !id_card_url) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.prepare(
    `UPDATE users SET legal_name = ?, legal_address = ?, country = ?, phone_number = ?, aadhaar_number = ?, id_card_url = ?,
     status = CASE WHEN status IN ('approved','agreement_pending','agreement_signed') THEN status ELSE 'pending' END
     WHERE id = ?`
  ).run(String(legal_name), String(legal_address), String(country), String(phone_number), String(aadhaar_number), String(id_card_url), userId);

  const user = db.prepare(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = ?`).get(userId);
  res.json({ user });
});

app.get("/api/admin/artists", (req, res) => {
  const artists = db
    .prepare(
      `SELECT 
        u.*,
        (SELECT a.status FROM agreements a WHERE a.artist_id = u.id ORDER BY a.id DESC LIMIT 1) as agreement_status
      FROM users u
      WHERE u.role = 'artist'
      ORDER BY u.id DESC`
    )
    .all();
  res.json(artists);
});

app.get("/api/admin/artist/:id", (req, res) => {
  const artist = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;
  if (!artist) return res.status(404).json({ error: "Artist not found" });
  const releases = db
    .prepare("SELECT * FROM releases WHERE artist_id = ? AND status != 'draft' ORDER BY created_at DESC")
    .all(req.params.id);
  const withdrawals = db.prepare("SELECT * FROM withdrawals WHERE artist_id = ? ORDER BY created_at DESC").all(req.params.id);
  const revenue = db.prepare("SELECT * FROM revenue WHERE artist_id = ? ORDER BY date DESC").all(req.params.id);
  const agreement = db.prepare("SELECT * FROM agreements WHERE artist_id = ? ORDER BY id DESC LIMIT 1").get(req.params.id);
  res.json({ ...artist, releases, withdrawals, revenue, agreement });
});

app.put("/api/admin/artist/:id/status", (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "Missing status" });

  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
  db.prepare("INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)").run(
    req.params.id,
    `Your account status has been updated to: ${status}`,
    "account_status",
    "/"
  );
  res.json({ success: true });
});

app.put("/api/admin/artist/:id/approve", (req, res) => {
  db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(req.params.id);
  db.prepare("INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)").run(
    req.params.id,
    "Your account has been approved! You can now start submitting releases.",
    "account_approved",
    "/"
  );
  res.json({ success: true });
});

app.delete("/api/admin/artist/:id", (req, res) => {
  const artistId = req.params.id;
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM notifications WHERE user_id = ?").run(artistId);
    db.prepare("DELETE FROM revenue WHERE artist_id = ?").run(artistId);
    db.prepare("DELETE FROM withdrawals WHERE artist_id = ?").run(artistId);
    db.prepare("DELETE FROM agreements WHERE artist_id = ?").run(artistId);

    const releases = db.prepare("SELECT id FROM releases WHERE artist_id = ?").all(artistId) as any[];
    for (const release of releases) {
      db.prepare("DELETE FROM tracks WHERE release_id = ?").run(release.id);
    }
    db.prepare("DELETE FROM releases WHERE artist_id = ?").run(artistId);
    db.prepare("DELETE FROM users WHERE id = ?").run(artistId);
  });

  transaction();
  res.json({ success: true });
});

const buildAgreementHtml = (artist: any, agreement: any) => {
  const artistShare = Number(agreement.artist_share ?? 50);
  const labelShare = Number(agreement.label_share ?? 50);
  const today = new Date().toLocaleDateString();
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Distribution Agreement</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: #111; color: #111; }
        .page { width: 900px; margin: 24px auto; background: #f7f7f7; padding: 40px; border-radius: 16px; }
        .header { text-align: center; margin-bottom: 24px; }
        .brand { font-weight: 900; letter-spacing: 0.12em; font-size: 12px; color: #555; }
        h1 { margin: 10px 0 0; font-size: 28px; }
        .meta { margin-top: 18px; font-size: 12px; color: #444; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .box { background: #fff; border: 1px solid #ddd; border-radius: 12px; padding: 14px; }
        .section { margin-top: 18px; }
        .section h2 { font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 8px; color: #333; }
        p { margin: 0 0 10px; color: #222; line-height: 1.6; font-size: 13px; }
        .shares { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .sigrow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; align-items: end; }
        .sigbox { height: 86px; border: 2px dashed #bbb; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; color: #777; font-size: 12px; }
        .sigimg { max-height: 80px; max-width: 100%; object-fit: contain; }
        .small { font-size: 11px; color: #666; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="brand">SONICSTREAM</div>
          <h1>DISTRIBUTION AGREEMENT</h1>
          <div class="small">Generated on ${today}</div>
        </div>

        <div class="meta">
          <div class="box">
            <div class="small">Artist Name</div>
            <div style="font-weight:800; font-size:14px;">${artist?.name || ""}</div>
          </div>
          <div class="box">
            <div class="small">Email</div>
            <div style="font-weight:800; font-size:14px;">${artist?.email || ""}</div>
          </div>
        </div>

        <div class="section">
          <h2>Revenue Share</h2>
          <div class="shares">
            <div class="box">
              <div class="small">Artist Share (%)</div>
              <div style="font-weight:900; font-size:22px;">${artistShare}%</div>
            </div>
            <div class="box">
              <div class="small">Label Share (%)</div>
              <div style="font-weight:900; font-size:22px;">${labelShare}%</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Terms</h2>
          <p>This agreement governs the distribution of the Artist's content through SonicStream and its partner platforms.</p>
          <p>By signing, the Artist acknowledges the platform's terms of service and confirms all information provided is accurate.</p>
        </div>

        <div class="section">
          <h2>Signature</h2>
          <div class="sigrow">
            <div>
              <div class="small">Artist Signature</div>
              <div class="sigbox">
                ${agreement?.signature_data_url ? `<img class="sigimg" src="${agreement.signature_data_url}" alt="Signature" />` : "SIGNATURE REQUIRED"}
              </div>
            </div>
            <div>
              <div class="small">Status</div>
              <div class="box">
                <div style="font-weight:900; font-size:14px;">${agreement?.status || "draft"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
};

app.get("/api/admin/artist/:id/agreement", (req, res) => {
  const agreement = db.prepare("SELECT * FROM agreements WHERE artist_id = ? ORDER BY id DESC LIMIT 1").get(req.params.id);
  res.json(agreement || null);
});

app.post("/api/admin/artist/:id/agreement", (req, res) => {
  const { artist_share, label_share } = req.body || {};
  const aShare = Number(artist_share);
  const lShare = Number(label_share);
  if (!Number.isFinite(aShare) || !Number.isFinite(lShare) || aShare + lShare !== 100) {
    return res.status(400).json({ error: "Shares must be numbers and sum to 100" });
  }

  const artist = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'artist'").get(req.params.id) as any;
  if (!artist) return res.status(404).json({ error: "Artist not found" });
  if (artist.status === "onboarding") return res.status(400).json({ error: "Artist must complete onboarding first" });

  const existing = db.prepare("SELECT * FROM agreements WHERE artist_id = ? ORDER BY id DESC LIMIT 1").get(req.params.id) as any;
  const baseAgreement = {
    artist_share: aShare,
    label_share: lShare,
    status: "sent",
    signature_data_url: existing?.signature_data_url || null,
  };
  const agreementHtml = buildAgreementHtml(artist, baseAgreement);

  db.prepare(
    "INSERT INTO agreements (artist_id, artist_share, label_share, status, agreement_html, signature_data_url, sent_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
  ).run(req.params.id, aShare, lShare, "sent", agreementHtml, existing?.signature_data_url || null);

  db.prepare("UPDATE users SET status = CASE WHEN status = 'approved' THEN status ELSE 'agreement_pending' END WHERE id = ?").run(
    req.params.id
  );

  db.prepare("INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)").run(
    req.params.id,
    "A distribution agreement is ready for your signature.",
    "agreement_sent",
    "/agreement"
  );

  res.json({ success: true });
});

app.post("/api/admin/artist/:id/agreement/verify", (req, res) => {
  const agreement = db.prepare("SELECT * FROM agreements WHERE artist_id = ? ORDER BY id DESC LIMIT 1").get(req.params.id) as any;
  if (!agreement) return res.status(404).json({ error: "Agreement not found" });
  if (!agreement.signature_data_url) return res.status(400).json({ error: "Agreement is not signed yet" });

  db.prepare("UPDATE agreements SET status = 'verified', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    agreement.id
  );
  db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(req.params.id);

  db.prepare("INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)").run(
    req.params.id,
    "Your agreement has been verified and your account is approved.",
    "agreement_verified",
    "/"
  );

  res.json({ success: true });
});

app.get("/api/admin/releases", (req, res) => {
  const releases = db
    .prepare(
      `SELECT releases.*, users.name as artist_name, users.email as artist_email 
       FROM releases 
       LEFT JOIN users ON releases.artist_id = users.id 
       WHERE releases.status != 'draft'
       ORDER BY releases.created_at DESC`
    )
    .all();
  res.json(releases);
});

app.get("/api/admin/release/:id", (req, res) => {
  const release = db.prepare("SELECT * FROM releases WHERE id = ?").get(req.params.id) as any;
  if (!release) return res.status(404).json({ error: "Release not found" });
  const tracks = db.prepare("SELECT * FROM tracks WHERE release_id = ?").all(req.params.id);
  const revenue = db.prepare("SELECT * FROM revenue WHERE release_id = ? ORDER BY date DESC").all(req.params.id);
  res.json({ ...release, tracks, revenue });
});

app.put("/api/admin/release/:id/status", (req, res) => {
  const { status, message, platform_links, admin_remarks } = req.body || {};
  if (!status) return res.status(400).json({ error: "Missing status" });

  const release = db.prepare("SELECT artist_id, title FROM releases WHERE id = ?").get(req.params.id) as any;
  if (!release) return res.status(404).json({ error: "Release not found" });

  db.prepare("UPDATE releases SET status = ?, platform_links = ?, admin_remarks = ? WHERE id = ?").run(
    status,
    platform_links ? JSON.stringify(platform_links) : null,
    admin_remarks || null,
    req.params.id
  );

  db.prepare("INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)").run(
    release.artist_id,
    `Your release "${release.title}" status updated to: ${status}. ${admin_remarks || message || ""}`,
    "status_update",
    `/release/${req.params.id}`
  );

  res.json({ success: true });
});

app.post("/api/admin/add-revenue", (req, res) => {
  const { artist_id, release_id, amount, platform } = req.body || {};
  const a = Number(amount);
  if (!artist_id || !release_id || !Number.isFinite(a) || !platform) return res.status(400).json({ error: "Invalid payload" });

  const transaction = db.transaction(() => {
    db.prepare("INSERT INTO revenue (artist_id, release_id, amount, platform) VALUES (?, ?, ?, ?)").run(
      artist_id,
      release_id,
      a,
      platform
    );
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(a, artist_id);

    const release = db.prepare("SELECT title FROM releases WHERE id = ?").get(release_id) as any;
    db.prepare("INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)").run(
      artist_id,
      `New revenue added: $${a} from ${platform} for "${release?.title || "a release"}"`,
      "revenue",
      `/release/${release_id}`
    );
  });

  transaction();
  res.json({ success: true });
});

app.get("/api/admin/withdrawals", (req, res) => {
  const withdrawals = db
    .prepare(
      `SELECT w.*, u.name as artist_name, u.bank_info 
       FROM withdrawals w
       JOIN users u ON w.artist_id = u.id
       ORDER BY w.created_at DESC`
    )
    .all();
  res.json(withdrawals);
});

app.put("/api/admin/withdrawal/:id", (req, res) => {
  const { status, payout_screenshot } = req.body || {};
  const withdrawal = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(req.params.id) as any;
  if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });

  const transaction = db.transaction(() => {
    db.prepare("UPDATE withdrawals SET status = ?, payout_screenshot = ? WHERE id = ?").run(
      status || withdrawal.status,
      payout_screenshot || withdrawal.payout_screenshot,
      req.params.id
    );

    let message = `Your withdrawal request for $${withdrawal.amount} has been ${status}.`;
    if (status === "approved") {
      db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(withdrawal.amount, withdrawal.artist_id);
      message = `Your withdrawal request for $${withdrawal.amount} has been approved.`;
    } else if (status === "completed") {
      message = `Your withdrawal of $${withdrawal.amount} has been transferred to your account.`;
    }

    db.prepare("INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)").run(
      withdrawal.artist_id,
      message,
      "withdrawal_status",
      "/wallet"
    );
  });

  transaction();
  res.json({ success: true });
});

app.get("/api/artist/agreement", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  if (!userId) return res.status(401).json({ error: "Missing user" });
  const agreement = db.prepare("SELECT * FROM agreements WHERE artist_id = ? ORDER BY id DESC LIMIT 1").get(userId);
  res.json(agreement || null);
});

app.post("/api/artist/agreement/sign", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  if (!userId) return res.status(401).json({ error: "Missing user" });
  const { signature_data_url } = req.body || {};
  if (!signature_data_url || typeof signature_data_url !== "string") return res.status(400).json({ error: "Missing signature" });

  const agreement = db.prepare("SELECT * FROM agreements WHERE artist_id = ? ORDER BY id DESC LIMIT 1").get(userId) as any;
  if (!agreement) return res.status(404).json({ error: "Agreement not found" });
  if (agreement.status !== "sent" && agreement.status !== "draft") return res.status(400).json({ error: "Agreement cannot be signed" });

  const artist = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  const updatedAgreement = { ...agreement, signature_data_url, status: "signed" };
  const agreementHtml = buildAgreementHtml(artist, updatedAgreement);

  db.prepare(
    "UPDATE agreements SET status = 'signed', signature_data_url = ?, signed_at = CURRENT_TIMESTAMP, agreement_html = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(signature_data_url, agreementHtml, agreement.id);

  db.prepare("UPDATE users SET status = CASE WHEN status = 'approved' THEN status ELSE 'agreement_signed' END WHERE id = ?").run(
    userId
  );

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as any[];
  admins.forEach((a) => {
    db.prepare("INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)").run(
      a.id,
      `Agreement signed by ${artist?.name || "an artist"}.`,
      "agreement_signed",
      "/artists"
    );
  });

  res.json({ success: true });
});

app.get("/api/artist/release/:id", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  const id = Number(req.params.id);
  const release = db.prepare("SELECT * FROM releases WHERE id = ? AND artist_id = ?").get(id, userId) as any;
  if (!release) return res.status(404).json({ error: "Release not found" });
  const tracks = db.prepare("SELECT * FROM tracks WHERE release_id = ? ORDER BY id ASC").all(id);
  res.json({ ...release, tracks });
});

app.post("/api/artist/releases", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  const body = req.body || {};
  const status = body.status || "pending";

  const info = db
    .prepare(
      `INSERT INTO releases (
        artist_id, title, title_version, genre, metadata_language, is_previously_released, original_release_date,
        price_code_general, price_code_itunes, artwork_url, status, release_date, stores, territories, territory_exclusion, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      body.title || "",
      body.title_version || "",
      body.genre || "Pop",
      body.metadata_language || "en",
      body.is_previously_released ? 1 : 0,
      body.original_release_date || "",
      body.price_code_general || "Full-Price",
      body.price_code_itunes || "$0.99",
      body.artwork_url || "",
      status,
      body.release_date || "",
      JSON.stringify(body.stores || []),
      JSON.stringify(body.territories || []),
      body.territory_exclusion ? 1 : 0,
      body.description || ""
    );

  const releaseId = Number(info.lastInsertRowid);
  const tracks = Array.isArray(body.tracks) ? body.tracks : [];
  const insertTrack = db.prepare(
    `INSERT INTO tracks (
      release_id, title, title_version, metadata_language, audio_language, origin, price_code, price_code_itunes, is_explicit,
      file_url, type, artist_name, composer, contributors
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  tracks.forEach((t: any) => {
    insertTrack.run(
      releaseId,
      t.title || "",
      t.title_version || "",
      t.metadata_language || "en",
      t.audio_language || "en",
      t.origin || "original",
      t.price_code || "Full-Price",
      t.price_code_itunes || "$0.99",
      t.is_explicit ? 1 : 0,
      t.file_url || "",
      t.type || "original",
      t.artist_name || "",
      t.composer || "",
      JSON.stringify(t.contributors || [])
    );
  });

  res.json({ ok: true, id: releaseId });
});

app.put("/api/artist/release/:id", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  const id = Number(req.params.id);
  const body = req.body || {};
  const existing = db.prepare("SELECT id FROM releases WHERE id = ? AND artist_id = ?").get(id, userId);
  if (!existing) return res.status(404).json({ error: "Release not found" });

  db.prepare(
    `UPDATE releases SET
      title = ?, title_version = ?, genre = ?, metadata_language = ?, is_previously_released = ?, original_release_date = ?,
      price_code_general = ?, price_code_itunes = ?, artwork_url = ?, status = ?, release_date = ?, stores = ?, territories = ?,
      territory_exclusion = ?, description = ?
     WHERE id = ?`
  ).run(
    body.title || "",
    body.title_version || "",
    body.genre || "Pop",
    body.metadata_language || "en",
    body.is_previously_released ? 1 : 0,
    body.original_release_date || "",
    body.price_code_general || "Full-Price",
    body.price_code_itunes || "$0.99",
    body.artwork_url || "",
    body.status || "pending",
    body.release_date || "",
    JSON.stringify(body.stores || []),
    JSON.stringify(body.territories || []),
    body.territory_exclusion ? 1 : 0,
    body.description || "",
    id
  );

  db.prepare("DELETE FROM tracks WHERE release_id = ?").run(id);
  const tracks = Array.isArray(body.tracks) ? body.tracks : [];
  const insertTrack = db.prepare(
    `INSERT INTO tracks (
      release_id, title, title_version, metadata_language, audio_language, origin, price_code, price_code_itunes, is_explicit,
      file_url, type, artist_name, composer, contributors
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  tracks.forEach((t: any) => {
    insertTrack.run(
      id,
      t.title || "",
      t.title_version || "",
      t.metadata_language || "en",
      t.audio_language || "en",
      t.origin || "original",
      t.price_code || "Full-Price",
      t.price_code_itunes || "$0.99",
      t.is_explicit ? 1 : 0,
      t.file_url || "",
      t.type || "original",
      t.artist_name || "",
      t.composer || "",
      JSON.stringify(t.contributors || [])
    );
  });

  res.json({ ok: true });
});

app.get("/api/artist/notifications", (req, res) => {
  const userId = Number(req.headers["x-user-id"]);
  const notifications = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(userId);
  res.json(notifications);
});

app.get("/api/admin/notifications", (req, res) => {
  const notifications = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50").all();
  res.json(notifications);
});

app.put("/api/notifications/:id/read", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
  res.json({ ok: true });
});

const start = async () => {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { port: 24679, clientPort: 24679 } },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const templatePath = path.resolve(__dirname, "index.html");
      const template = await fs.promises.readFile(templatePath, "utf-8");
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  const port = Number(process.env.PORT || 5173);
  app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });
};

start();
