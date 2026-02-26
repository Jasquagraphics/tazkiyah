import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});
const upload = multer({ storage });

const db = new Database("agency.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'artist',
    bank_info TEXT,
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'approved',
    profile_image TEXT,
    whatsapp_enabled INTEGER DEFAULT 0,
    whatsapp_number TEXT
  );

  CREATE TABLE IF NOT EXISTS releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER,
    title TEXT,
    artwork_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    release_date TEXT,
    stores TEXT,
    description TEXT,
    platform_links TEXT,
    admin_remarks TEXT,
    FOREIGN KEY(artist_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER,
    title TEXT,
    file_url TEXT,
    type TEXT,
    artist_name TEXT,
    composer TEXT,
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
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migrations for existing tables
try { db.exec("ALTER TABLE users ADD COLUMN profile_image TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN whatsapp_enabled INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN whatsapp_number TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE releases ADD COLUMN description TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE releases ADD COLUMN platform_links TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE releases ADD COLUMN release_date TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE releases ADD COLUMN stores TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE releases ADD COLUMN admin_remarks TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tracks ADD COLUMN artist_name TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tracks ADD COLUMN composer TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tracks ADD COLUMN type TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE withdrawals ADD COLUMN payout_screenshot TEXT"); } catch (e) {}

// Seed Admin if not exists
const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!admin) {
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
    "admin@sonicstream.com",
    "admin123",
    "System Admin",
    "admin"
  );
}

async function startServer() {
  const app = express();
  
  // Request Logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const PORT = process.env.PORT || 3000;

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- API ROUTES ---

  // Auth
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/register", (req, res) => {
    const { email, password, name } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)").run(email, password, name);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  // File Upload
  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // Return the URL path
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Artist Routes
  app.get("/api/artist/releases", (req, res) => {
    const artistId = req.headers["x-user-id"];
    if (!artistId) return res.status(401).json({ error: "Unauthorized" });
    const releases = db.prepare("SELECT * FROM releases WHERE artist_id = ? ORDER BY created_at DESC").all(artistId);
    res.json(releases);
  });

  app.post("/api/artist/releases", (req, res) => {
    const artistId = req.headers["x-user-id"];
    if (!artistId) return res.status(401).json({ error: "Unauthorized" });
    
    const { title, artwork_url, release_date, description, stores, tracks } = req.body;

    if (!title || !artwork_url || !tracks || tracks.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const transaction = db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO releases (artist_id, title, artwork_url, release_date, description, stores)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(artistId, title, artwork_url, release_date, description, JSON.stringify(stores));
        
        const releaseId = result.lastInsertRowid;

        const insertTrack = db.prepare(`
          INSERT INTO tracks (release_id, title, file_url, type, artist_name, composer)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const track of tracks) {
          insertTrack.run(releaseId, track.title, track.file_url, track.type, track.artist_name, track.composer);
        }

        return releaseId;
      });

      const releaseId = transaction();
      res.json({ success: true, id: releaseId });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/artist/release/:id", (req, res) => {
    const artistId = req.headers["x-user-id"];
    const requestUser = db.prepare("SELECT role FROM users WHERE id = ?").get(artistId);
    
    let release;
    if (requestUser && requestUser.role === 'admin') {
       release = db.prepare("SELECT * FROM releases WHERE id = ?").get(req.params.id);
    } else {
       release = db.prepare("SELECT * FROM releases WHERE id = ? AND artist_id = ?").get(req.params.id, artistId);
    }

    if (!release) return res.status(404).json({ error: "Release not found" });
    
    const tracks = db.prepare("SELECT * FROM tracks WHERE release_id = ?").all(req.params.id);
    const revenue = db.prepare("SELECT * FROM revenue WHERE release_id = ?").all(req.params.id);
    
    res.json({ ...release, tracks, revenue });
  });

  app.put("/api/artist/release/:id", (req, res) => {
    const artistId = req.headers["x-user-id"];
    const { title, artwork_url, release_date, description, stores, tracks } = req.body;
    
    const release = db.prepare("SELECT * FROM releases WHERE id = ? AND artist_id = ?").get(req.params.id, artistId);
    if (!release) return res.status(404).json({ error: "Release not found" });
    if (release.status === 'approved') return res.status(400).json({ error: "Cannot edit approved release" });

    try {
      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE releases 
          SET title = ?, artwork_url = ?, release_date = ?, description = ?, stores = ?
          WHERE id = ?
        `).run(title, artwork_url, release_date, description, JSON.stringify(stores), req.params.id);
        
        db.prepare("DELETE FROM tracks WHERE release_id = ?").run(req.params.id);

        const insertTrack = db.prepare(`
          INSERT INTO tracks (release_id, title, file_url, type, artist_name, composer)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const track of tracks) {
          insertTrack.run(req.params.id, track.title, track.file_url, track.type, track.artist_name, track.composer);
        }
      });

      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/artist/release/:id", (req, res) => {
    const artistId = req.headers["x-user-id"];
    const release = db.prepare("SELECT status FROM releases WHERE id = ? AND artist_id = ?").get(req.params.id, artistId);
    
    if (!release) return res.status(404).json({ error: "Release not found" });
    if (release.status === 'approved') return res.status(400).json({ error: "Cannot delete approved release" });

    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM tracks WHERE release_id = ?").run(req.params.id);
      db.prepare("DELETE FROM releases WHERE id = ?").run(req.params.id);
    });
    
    transaction();
    res.json({ success: true });
  });

  app.get("/api/artist/balance", (req, res) => {
    const artistId = req.headers["x-user-id"];
    const user = db.prepare("SELECT balance FROM users WHERE id = ?").get(artistId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const history = db.prepare("SELECT * FROM revenue WHERE artist_id = ? ORDER BY date DESC").all(artistId);
    res.json({ balance: user.balance, history });
  });

  app.get("/api/artist/withdrawals", (req, res) => {
    const artistId = req.headers["x-user-id"];
    const withdrawals = db.prepare("SELECT * FROM withdrawals WHERE artist_id = ? ORDER BY created_at DESC").all(artistId);
    res.json(withdrawals);
  });

  app.post("/api/artist/withdraw", (req, res) => {
    const artistId = req.headers["x-user-id"];
    const { amount } = req.body;
    
    const user = db.prepare("SELECT balance FROM users WHERE id = ?").get(artistId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO withdrawals (artist_id, amount) VALUES (?, ?)").run(artistId, amount);
      db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(amount, artistId);
    });

    transaction();
    res.json({ success: true });
  });

  app.put("/api/artist/profile", (req, res) => {
    const artistId = req.headers["x-user-id"];
    const { name, email, bank_info, whatsapp_enabled, whatsapp_number, profile_image } = req.body;
    
    db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, bank_info = ?, whatsapp_enabled = ?, whatsapp_number = ?, profile_image = ?
      WHERE id = ?
    `).run(name, email, bank_info, whatsapp_enabled ? 1 : 0, whatsapp_number, profile_image, artistId);
    
    res.json({ success: true });
  });

  app.get("/api/artist/notifications", (req, res) => {
    const userId = req.headers["x-user-id"];
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(userId);
    res.json(notifications);
  });

  // --- ADMIN ROUTES ---

  app.get("/api/admin/stats", (req, res) => {
    const totalRevenueResult = db.prepare("SELECT SUM(amount) as total FROM revenue").get();
    const totalUsersResult = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'artist'").get();
    const totalReleasesResult = db.prepare("SELECT COUNT(*) as count FROM releases").get();
    const pendingWithdrawalsResult = db.prepare("SELECT SUM(amount) as total FROM withdrawals WHERE status = 'pending'").get();
    
    // Revenue by platform
    const revenueByPlatform = db.prepare("SELECT platform as name, SUM(amount) as value FROM revenue GROUP BY platform").all();

    res.json({
      totalRevenue: totalRevenueResult.total || 0,
      totalUsers: totalUsersResult.count || 0,
      totalReleases: totalReleasesResult.count || 0,
      pendingWithdrawals: pendingWithdrawalsResult.total || 0,
      revenueByPlatform
    });
  });

  app.get("/api/admin/releases", (req, res) => {
    const releases = db.prepare(`
      SELECT releases.*, users.name as artist_name, users.email as artist_email
      FROM releases 
      JOIN users ON releases.artist_id = users.id 
      ORDER BY releases.created_at DESC
    `).all();
    res.json(releases);
  });

  app.get("/api/admin/release/:id", (req, res) => {
    const release = db.prepare(`
        SELECT releases.*, users.name as artist_name, users.email as artist_email
        FROM releases 
        JOIN users ON releases.artist_id = users.id
        WHERE releases.id = ?
    `).get(req.params.id);

    if (!release) return res.status(404).json({ error: "Release not found" });
    
    const tracks = db.prepare("SELECT * FROM tracks WHERE release_id = ?").all(req.params.id);
    const revenue = db.prepare("SELECT * FROM revenue WHERE release_id = ?").all(req.params.id);
    
    res.json({ ...release, tracks, revenue });
  });

  app.put("/api/admin/release/:id/status", (req, res) => {
    const { status, message } = req.body;
    
    db.prepare("UPDATE releases SET status = ?, admin_remarks = ? WHERE id = ?").run(status, message, req.params.id);
    
    // Create notification
    const release = db.prepare("SELECT artist_id, title FROM releases WHERE id = ?").get(req.params.id);
    if (release) {
      db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)").run(
        release.artist_id,
        `Your release "${release.title}" status has been updated to ${status}. ${message || ''}`,
        'info'
      );
    }

    res.json({ success: true });
  });

  app.get("/api/admin/artists", (req, res) => {
    const artists = db.prepare("SELECT * FROM users WHERE role = 'artist'").all();
    const artistsWithStats = artists.map((artist: any) => {
        const releaseCount = db.prepare("SELECT COUNT(*) as count FROM releases WHERE artist_id = ?").get(artist.id).count;
        return { ...artist, releases_count: releaseCount };
    });
    res.json(artistsWithStats);
  });

  app.post("/api/admin/add-revenue", (req, res) => {
    const { artist_id, release_id, amount, platform } = req.body;
    
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO revenue (artist_id, release_id, amount, platform) VALUES (?, ?, ?, ?)").run(artist_id, release_id, amount, platform);
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(amount, artist_id);
      
      // Notify artist
      db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)").run(
        artist_id,
        `You received $${amount} revenue from ${platform}.`,
        'revenue'
      );
    });

    transaction();
    res.json({ success: true });
  });

  app.get("/api/admin/withdrawals", (req, res) => {
    const withdrawals = db.prepare(`
      SELECT withdrawals.*, users.name as artist_name, users.bank_info 
      FROM withdrawals 
      JOIN users ON withdrawals.artist_id = users.id 
      ORDER BY withdrawals.created_at DESC
    `).all();
    res.json(withdrawals);
  });

  app.put("/api/admin/withdrawal/:id", (req, res) => {
    const { status, payout_screenshot } = req.body;
    db.prepare("UPDATE withdrawals SET status = ?, payout_screenshot = ? WHERE id = ?").run(status, payout_screenshot, req.params.id);
    
    // Notify artist
    const withdrawal = db.prepare("SELECT artist_id, amount FROM withdrawals WHERE id = ?").get(req.params.id);
    if (withdrawal) {
      db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)").run(
        withdrawal.artist_id,
        `Your withdrawal request for $${withdrawal.amount} has been ${status}.`,
        'payment'
      );
    }
    
    res.json({ success: true });
  });

  app.get("/api/admin/artist/:id", (req, res) => {
    const artist = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!artist) return res.status(404).json({ error: "Artist not found" });
    
    const releases = db.prepare("SELECT * FROM releases WHERE artist_id = ? ORDER BY created_at DESC").all(req.params.id);
    const revenue = db.prepare("SELECT * FROM revenue WHERE artist_id = ? ORDER BY date DESC").all(req.params.id);
    
    res.json({ ...artist, releases, revenue });
  });

  app.put("/api/admin/artist/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/artist/:id", (req, res) => {
    const transaction = db.transaction(() => {
      // Delete dependencies first
      db.prepare("DELETE FROM tracks WHERE release_id IN (SELECT id FROM releases WHERE artist_id = ?)").run(req.params.id);
      db.prepare("DELETE FROM releases WHERE artist_id = ?").run(req.params.id);
      db.prepare("DELETE FROM revenue WHERE artist_id = ?").run(req.params.id);
      db.prepare("DELETE FROM withdrawals WHERE artist_id = ?").run(req.params.id);
      db.prepare("DELETE FROM notifications WHERE user_id = ?").run(req.params.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    });
    
    transaction();
    res.json({ success: true });
  });

  // Setup Vite or Static serving
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Development: Use Vite Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(vite.middlewares);

    // Serve SPA for unknown routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production: Serve built files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    // Serve index.html for any other route
    app.use('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
