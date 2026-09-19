const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const db = new Database(process.env.VERCEL ? "/tmp/portal.db" : path.join(ROOT, "data", "portal.db"));

db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  organisation TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  country TEXT,
  role TEXT NOT NULL DEFAULT 'sponsor',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  summary TEXT NOT NULL,
  target_beneficiaries TEXT,
  budget_usd REAL,
  status TEXT NOT NULL DEFAULT 'seeking_partners',
  proposal_file TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  amount_usd REAL,
  attachment TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  sector TEXT NOT NULL,
  deadline TEXT,
  amount TEXT,
  url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'monitor',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  opportunity_id INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, opportunity_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(opportunity_id) REFERENCES opportunities(id)
);

CREATE TABLE IF NOT EXISTS kyc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  registration_no TEXT,
  country TEXT NOT NULL,
  website TEXT,
  contact_person TEXT,
  document_file TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_note TEXT,
  reviewed_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS project_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  reviewer TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'pending',
  score REAL,
  note TEXT,
  reviewed_at TEXT,
  UNIQUE(project_id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  score REAL NOT NULL,
  rationale TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(opportunity_id, project_id),
  FOREIGN KEY(opportunity_id) REFERENCES opportunities(id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS due_diligence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL UNIQUE,
  checks TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  completed_at TEXT,
  FOREIGN KEY(application_id) REFERENCES applications(id)
);
CREATE TABLE IF NOT EXISTS funding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL UNIQUE,
  approved_amount_usd REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  agreement_file TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  funded_at TEXT,
  note TEXT,
  FOREIGN KEY(application_id) REFERENCES applications(id)
);
CREATE TABLE IF NOT EXISTS implementation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL UNIQUE,
  start_date TEXT,
  end_date TEXT,
  milestones TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  note TEXT,
  FOREIGN KEY(application_id) REFERENCES applications(id)
);
CREATE TABLE IF NOT EXISTS monitoring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  metric TEXT NOT NULL,
  target TEXT,
  actual TEXT,
  reporting_period TEXT,
  evidence_file TEXT,
  status TEXT NOT NULL DEFAULT 'reported',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES applications(id)
);
CREATE TABLE IF NOT EXISTS donor_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  period TEXT,
  summary TEXT NOT NULL,
  report_file TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES applications(id)
);
`);


// Optional first-run admin bootstrap. Set ADMIN_EMAIL and ADMIN_PASSWORD in production.
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const existing = db.prepare("SELECT id FROM users WHERE email=?").get(process.env.ADMIN_EMAIL.toLowerCase());
  if (!existing) {
    const hash = require("bcryptjs").hashSync(process.env.ADMIN_PASSWORD, 12);
    db.prepare(`INSERT INTO users(name,organisation,email,password_hash,country,role)
      VALUES(?,?,?,?,?,?)`).run("SOF Administrator", "Sam Oyus Foundation",
      process.env.ADMIN_EMAIL.toLowerCase(), hash, "Nigeria", "admin");
  }
}

const count = db.prepare("SELECT COUNT(*) AS n FROM projects").get().n;
if (!count) {
  const insert = db.prepare(`INSERT INTO projects
    (title, category, location, summary, target_beneficiaries, budget_usd, status, proposal_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  insert.run(
    "Youth Skills & Work-Readiness Accelerator", "Youth & Skills", "Modakeke, Osun State, Nigeria",
    "Vocational and digital skills training linked to tools, mentorship and pathways into work or enterprise.",
    "Young people and vocational trainees", 75000, "seeking_partners", "youth-skills-accelerator.pdf"
  );
  insert.run(
    "Community Business Incubation Centre", "Enterprise & Incubation", "Modakeke, Osun State, Nigeria",
    "A proposed incubation model where trained people can practice, produce, display, sell and grow their businesses.",
    "Vocational graduates and early-stage entrepreneurs", 150000, "concept_development", "business-incubation-centre.pdf"
  );
  insert.run(
    "School Learning & ICT Support", "Education", "Modakeke, Osun State, Nigeria",
    "School materials, scholarships and technology/innovation learning opportunities for children and young people.",
    "Primary, secondary and tertiary learners", 50000, "seeking_partners", "education-ict-support.pdf"
  );
  insert.run(
    "Agriculture & Livelihoods Support", "Agriculture", "Osun State, Nigeria",
    "Modern agricultural techniques, farmer education and livelihood support designed around economic independence.",
    "Farmers and young people in agriculture", 100000, "concept_development", "agriculture-livelihoods.pdf"
  );
  insert.run(
    "Community Health & Wellbeing Initiative", "Health", "Osun State, Nigeria",
    "A partner-led community wellbeing intervention to be developed with qualified health organisations.",
    "Underserved community members", 60000, "concept_development", "health-wellbeing.pdf"
  );
}

const upload = multer({
 dest: process.env.VERCEL ? "/tmp/uploads" : path.join(ROOT, "uploads"),
  limits: { fileSize: 8 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "CHANGE_THIS_IN_PRODUCTION",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000*60*60*8 }
}));
app.use(express.static(path.join(ROOT, "public")));


function requireAdmin(req,res,next) {
  if (!req.session.userId) return res.status(401).json({error:"Authentication required"});
  const u = user(req);
  if (!u || u.role !== "admin") return res.status(403).json({error:"SOF administrator access required"});
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({error:"Authentication required"});
  next();
}
function user(req) {
  return db.prepare("SELECT id,name,organisation,email,country,role,created_at FROM users WHERE id=?").get(req.session.userId);
}

app.get("/api/session", (req,res) => res.json({user: req.session.userId ? user(req) : null}));

app.post("/api/register", async (req,res) => {
  const {name, organisation, email, password, country} = req.body;
  if (!name || !organisation || !email || !password) return res.status(400).json({error:"Name, organisation, email and password are required."});
  if (password.length < 8) return res.status(400).json({error:"Password must be at least 8 characters."});
  try {
    const hash = await bcrypt.hash(password, 12);
    const info = db.prepare("INSERT INTO users(name,organisation,email,password_hash,country) VALUES(?,?,?,?,?)")
      .run(name.trim(), organisation.trim(), email.trim().toLowerCase(), hash, country || "");
    req.session.userId = info.lastInsertRowid;
    res.json({user: user(req)});
  } catch (e) {
    if (String(e).includes("UNIQUE")) return res.status(409).json({error:"An account with this email already exists."});
    res.status(500).json({error:"Could not create account."});
  }
});

app.post("/api/login", async (req,res) => {
  const {email,password} = req.body;
  const u = db.prepare("SELECT * FROM users WHERE email=?").get((email||"").toLowerCase().trim());
  if (!u || !(await bcrypt.compare(password||"", u.password_hash))) return res.status(401).json({error:"Invalid email or password."});
  req.session.userId = u.id;
  res.json({user: user(req)});
});
app.post("/api/logout", (req,res) => req.session.destroy(()=>res.json({ok:true})));

app.get("/api/projects", (req,res) => {
  const q = (req.query.q||"").trim();
  const category = (req.query.category||"").trim();
  let sql = "SELECT * FROM projects WHERE 1=1";
  const args = [];
  if(q){sql += " AND (title LIKE ? OR summary LIKE ? OR location LIKE ?)"; const x=`%${q}%`; args.push(x,x,x);}
  if(category){sql += " AND category=?"; args.push(category);}
  sql += " ORDER BY id DESC";
  res.json(db.prepare(sql).all(...args));
});

app.get("/api/projects/:id", (req,res) => {
  const p = db.prepare("SELECT * FROM projects WHERE id=?").get(req.params.id);
  if(!p) return res.status(404).json({error:"Project not found"});
  res.json(p);
});

app.post("/api/applications", requireAuth, upload.single("attachment"), (req,res) => {
  const {project_id,message,amount_usd} = req.body;
  if(!project_id || !message) return res.status(400).json({error:"Project and partnership message are required."});
  const p = db.prepare("SELECT id FROM projects WHERE id=?").get(project_id);
  if(!p) return res.status(404).json({error:"Project not found."});
  const attachment = req.file ? path.basename(req.file.path) : null;
  const info = db.prepare(`INSERT INTO applications(user_id,project_id,message,amount_usd,attachment)
    VALUES(?,?,?,?,?)`).run(req.session.userId, project_id, message, amount_usd || null, attachment);
  res.json({id:info.lastInsertRowid,status:"submitted"});
});

app.get("/api/my/applications", requireAuth, (req,res) => {
  res.json(db.prepare(`SELECT a.*,p.title,p.category FROM applications a JOIN projects p ON p.id=a.project_id
    WHERE a.user_id=? ORDER BY a.id DESC`).all(req.session.userId));
});

app.get("/api/opportunities", (req,res) => {
  res.json(db.prepare("SELECT * FROM opportunities ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'monitor' THEN 1 ELSE 2 END, deadline").all());
});

app.post("/api/opportunities/:id/subscribe", requireAuth, (req,res) => {
  try {
    db.prepare("INSERT INTO alerts(user_id,opportunity_id) VALUES(?,?)").run(req.session.userId, req.params.id);
    res.json({ok:true});
  } catch(e) { res.json({ok:true,already:true}); }
});

app.get("/api/my/alerts", requireAuth, (req,res) => {
  res.json(db.prepare(`SELECT o.*,a.read FROM alerts a JOIN opportunities o ON o.id=a.opportunity_id
    WHERE a.user_id=? ORDER BY a.id DESC`).all(req.session.userId));
});

app.get("/api/dashboard", requireAuth, (req,res) => {
  const applications = db.prepare(`SELECT a.*,p.title,p.category FROM applications a JOIN projects p ON p.id=a.project_id
    WHERE a.user_id=? ORDER BY a.id DESC`).all(req.session.userId);
  const alerts = db.prepare(`SELECT o.*,a.read FROM alerts a JOIN opportunities o ON o.id=a.opportunity_id
    WHERE a.user_id=? ORDER BY a.id DESC`).all(req.session.userId);
  res.json({user:user(req), applications, alerts});
});

app.get("/api/proposals/:file", (req,res) => {
  const safe = path.basename(req.params.file);
  const file = path.join(ROOT,"public","proposals",safe);
  if(!fs.existsSync(file)) return res.status(404).send("Proposal not found.");
  res.download(file);
});

app.get("*", (req,res) => res.sendFile(path.join(ROOT,"public","index.html")));

// Vercel serverless entrypoint
module.exports = app;

app.listen(PORT, () => console.log(`Sam Oyus Foundation portal running at http://localhost:${PORT}`));
