import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

let Database = null
let db = null

const DATA_DIR = process.env.DATA_DIR || 'data'
const dbPath = path.resolve(process.cwd(), DATA_DIR, 'time_tracker.db')
const fallbacks = {
  users: path.resolve(process.cwd(), DATA_DIR, 'users.sqlite.json'),
  orgs: path.resolve(process.cwd(), DATA_DIR, 'organizations.sqlite.json'),
  companies: path.resolve(process.cwd(), DATA_DIR, 'companies.sqlite.json'),
  transactions: path.resolve(process.cwd(), DATA_DIR, 'transactions.sqlite.json'),
  requests: path.resolve(process.cwd(), DATA_DIR, 'time_requests.sqlite.json')
}
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

try {
  // Dynamically import to allow environments without native build tools to still run (fallback to JSON)
  const mod = await import('better-sqlite3')
  Database = mod.default
  db = new Database(dbPath)
  // Initialize schema
  db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    credits INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('super_admin','manager','employee')),
    timezone TEXT DEFAULT 'UTC',
    created_at TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    name TEXT NOT NULL,
    manager_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY(manager_id) REFERENCES users(id),
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    amount INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
    description TEXT,
    reference_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    FOREIGN KEY(company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS time_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    employee_id INTEGER,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL,
    action_by INTEGER,
    action_at TEXT,
    FOREIGN KEY(company_id) REFERENCES companies(id),
    FOREIGN KEY(employee_id) REFERENCES users(id)
  );
  `)
  
  // Migration: Ensure company_id column exists
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all()
    if (!tableInfo.find(c => c.name === 'company_id')) {
      db.exec("ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id)")
      console.log('[sqlite] Migrated users table: added company_id')
    }
    if (!tableInfo.find(c => c.name === 'timezone')) {
      db.exec("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC'")
      console.log('[sqlite] Migrated users table: added timezone')
    }
    const orgInfo = db.prepare("PRAGMA table_info(organizations)").all()
    if (!orgInfo.find(c => c.name === 'company_id')) {
      db.exec("ALTER TABLE organizations ADD COLUMN company_id INTEGER REFERENCES companies(id)")
      console.log('[sqlite] Migrated organizations table: added company_id')
    }
  } catch (e) {
    console.error('[sqlite] Migration check failed:', e)
  }

  // Migration: Default Company for existing data
  const defaultCompany = db.prepare("SELECT * FROM companies WHERE id = 1").get()
  if (!defaultCompany) {
    const now = new Date().toISOString()
    // Check if we have users to migrate
    const userCount = db.prepare("SELECT count(*) as c FROM users").get().c
    if (userCount > 0) {
      console.log('[sqlite] Creating Default Company for existing users...')
      db.prepare("INSERT INTO companies (id, name, created_at) VALUES (1, 'Default Company', ?)").run(now)
      db.prepare("UPDATE users SET company_id = 1 WHERE company_id IS NULL").run()
      db.prepare("UPDATE organizations SET company_id = 1 WHERE company_id IS NULL").run()
    }
  }

  console.log('[sqlite] Using better-sqlite3 at', dbPath)
} catch (e) {
  console.info('[sqlite] better-sqlite3 not available; using JSON store for dev:', e?.message || e)
  for (const p of Object.values(fallbacks)) {
    if (!fs.existsSync(p)) fs.writeFileSync(p, '[]')
  }
}

export { db }

export function getUserByEmail(email) {
  if (db) {
    const stmt = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)')
    return stmt.get(email)
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  return arr.find(u => String(u.email).toLowerCase() === String(email).toLowerCase())
}

export function createCompany({ name }) {
  const now = new Date().toISOString()
  if (db) {
    const stmt = db.prepare('INSERT INTO companies (name, created_at, plan, credits) VALUES (?, ?, ?, ?)')
    const info = stmt.run(name, now, 'free', 0)
    return { id: info.lastInsertRowid, name, created_at: now, plan: 'free', credits: 0 }
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.companies, 'utf-8'))
  const id = (arr[arr.length - 1]?.id || 0) + 1
  const record = { id, name, created_at: now, plan: 'free', credits: 0 }
  arr.push(record)
  fs.writeFileSync(fallbacks.companies, JSON.stringify(arr, null, 2))
  return record
}

export function getCompanyById(id) {
  if (!id) return null
  if (db) {
    return db.prepare('SELECT * FROM companies WHERE id = ?').get(id)
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.companies, 'utf-8'))
  return arr.find(c => String(c.id) === String(id))
}

export function createUser({ email, password, role, company_id }) {
  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()
  if (db) {
    const stmt = db.prepare('INSERT INTO users (email, password_hash, role, created_at, company_id, timezone) VALUES (?, ?, ?, ?, ?, ?)')
    const info = stmt.run(email, hash, role, now, company_id || null, 'UTC')
    return { id: info.lastInsertRowid, email, role, created_at: now, company_id: company_id || null, timezone: 'UTC' }
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  const id = (arr[arr.length - 1]?.id || 0) + 1
  const record = { id, email, password_hash: hash, role, created_at: now, company_id: company_id || null, timezone: 'UTC' }
  arr.push(record)
  fs.writeFileSync(fallbacks.users, JSON.stringify(arr, null, 2))
  return { id, email, role, created_at: now, company_id: company_id || null, timezone: 'UTC' }
}

export function verifyPassword(user, password) {
  if (!user) return false
  return bcrypt.compareSync(password, user.password_hash)
}

export function getSuperAdmin() {
  if (db) {
    const stmt = db.prepare("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1")
    return stmt.get()
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  return arr.find(u => u.role === 'super_admin')
}

export function seedDefaultSuperAdmin() {
  const existing = getSuperAdmin()
  if (existing) return existing
  const email = process.env.SUPERADMIN_EMAIL || 'admin@example.com'
  const password = process.env.SUPERADMIN_PASSWORD || 'admin123'
  return createUser({ email, password, role: 'super_admin' })
}

export function createOrganization({ name, managerId, company_id }) {
  const now = new Date().toISOString()
  if (db) {
    const stmt = db.prepare('INSERT INTO organizations (name, manager_id, created_at, company_id) VALUES (?, ?, ?, ?)')
    const info = stmt.run(name, managerId || null, now, company_id || null)
    return { id: info.lastInsertRowid, name, manager_id: managerId || null, created_at: now, company_id: company_id || null }
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.orgs, 'utf-8'))
  const id = (arr[arr.length - 1]?.id || 0) + 1
  const record = { id, name, manager_id: managerId || null, created_at: now, company_id: company_id || null }
  arr.push(record)
  fs.writeFileSync(fallbacks.orgs, JSON.stringify(arr, null, 2))
  return record
}

export function getOrganizationByManagerId(managerId) {
  // Implicitly, managerId is unique, so this still works. 
  // We don't strictly need company_id here if manager belongs to one company.
  if (db) {
    let stmt = db.prepare('SELECT * FROM organizations WHERE manager_id = ? LIMIT 1')
    let org = stmt.get(managerId)
    if (!org && typeof managerId === 'string') {
      try {
        stmt = db.prepare('SELECT * FROM organizations WHERE manager_id = ? LIMIT 1')
        org = stmt.get(managerId)
      } catch {}
    }
    return org
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.orgs, 'utf-8'))
  return arr.find(o => o.manager_id === managerId || String(o.manager_id).toLowerCase() === String(managerId).toLowerCase())
}

export function listManagers(company_id) {
  if (db) {
    let sql = "SELECT id, email, role, created_at, company_id FROM users WHERE role = 'manager'"
    if (company_id) {
      sql += " AND company_id = ?"
      return db.prepare(sql).all(company_id)
    }
    return db.prepare(sql).all()
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  let res = arr.filter(u => u.role === 'manager')
  if (company_id) {
    res = res.filter(u => u.company_id == company_id)
  }
  return res.map(u => ({ id: u.id, email: u.email, role: u.role, created_at: u.created_at, company_id: u.company_id }))
}

// Upsert an employee's password; creates the user if missing with role 'employee'
export function upsertEmployeePassword(email, password, company_id) {
  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()
  if (db) {
    const getStmt = db.prepare('SELECT * FROM users WHERE email = ?')
    const existing = getStmt.get(email)
    if (existing) {
      // Ensure company match if company_id is provided? 
      // Ideally yes, but email is unique. 
      // If user exists in another company, this would takeover? 
      // Multi-tenant systems usually don't allow same email in different tenants unless scoped by tenant. 
      // But 'email' is UNIQUE in schema. So user belongs to one company.
      // If existing.company_id != company_id, it's an error (user exists in another company).
      if (company_id && existing.company_id && existing.company_id != company_id) {
        throw new Error('User already exists in another company')
      }
      const upd = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?')
      upd.run(hash, email)
      return { id: existing.id, email, company_id: existing.company_id, timezone: existing.timezone || 'UTC' }
    }
    const ins = db.prepare('INSERT INTO users (email, password_hash, role, created_at, company_id, timezone) VALUES (?, ?, ?, ?, ?, ?)')
    const info = ins.run(email, hash, 'employee', now, company_id || null, 'UTC')
    return { id: info.lastInsertRowid, email, company_id: company_id || null, timezone: 'UTC' }
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  const idx = arr.findIndex(u => u.email === email)
  if (idx >= 0) {
    const existing = arr[idx]
    if (company_id && existing.company_id && existing.company_id != company_id) {
      throw new Error('User already exists in another company')
    }
    arr[idx].password_hash = hash
    fs.writeFileSync(fallbacks.users, JSON.stringify(arr, null, 2))
    return { id: arr[idx].id, email, company_id: existing.company_id, timezone: existing.timezone || 'UTC' }
  }
  const id = (arr[arr.length - 1]?.id || 0) + 1
  const record = { id, email, password_hash: hash, role: 'employee', created_at: now, company_id: company_id || null, timezone: 'UTC' }
  arr.push(record)
  fs.writeFileSync(fallbacks.users, JSON.stringify(arr, null, 2))
  return { id, email, company_id: company_id || null, timezone: 'UTC' }
}

// Delete helpers
export function deleteUserById(id) {
  if (db) {
    const del = db.prepare("DELETE FROM users WHERE id = ?")
    const info = del.run(id)
    return info.changes > 0
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  const next = arr.filter(u => String(u.id) !== String(id))
  const changed = next.length !== arr.length
  if (changed) fs.writeFileSync(fallbacks.users, JSON.stringify(next, null, 2))
  return changed
}

export function deleteUserByEmail(email) {
  if (db) {
    const del = db.prepare("DELETE FROM users WHERE email = ?")
    const info = del.run(email)
    return info.changes > 0
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  const next = arr.filter(u => String(u.email).toLowerCase() !== String(email).toLowerCase())
  const changed = next.length !== arr.length
  if (changed) fs.writeFileSync(fallbacks.users, JSON.stringify(next, null, 2))
  return changed
}

export function deleteOrganizationByManagerId(managerId) {
  if (db) {
    const del = db.prepare('DELETE FROM organizations WHERE manager_id = ?')
    const info = del.run(managerId)
    return info.changes > 0
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.orgs, 'utf-8'))
  const next = arr.filter(o => String(o.manager_id) !== String(managerId))
  const changed = next.length !== arr.length
  if (changed) fs.writeFileSync(fallbacks.orgs, JSON.stringify(next, null, 2))
  return changed
}

export function createTransaction({ company_id, amount, credits, type, description, reference_id, status }) {
  const now = new Date().toISOString()
  if (db) {
    const stmt = db.prepare('INSERT INTO transactions (company_id, amount, credits, type, description, reference_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(company_id, amount, credits, type, description || '', reference_id || '', status || 'success', now)
    return { id: info.lastInsertRowid, company_id, amount, credits, type, description, reference_id, status, created_at: now }
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.transactions, 'utf-8'))
  const id = (arr[arr.length - 1]?.id || 0) + 1
  const record = { id, company_id, amount, credits, type, description, reference_id, status: status || 'success', created_at: now }
  arr.push(record)
  fs.writeFileSync(fallbacks.transactions, JSON.stringify(arr, null, 2))
  return record
}

export function getTransactions(company_id) {
  if (db) {
    return db.prepare('SELECT * FROM transactions WHERE company_id = ? ORDER BY created_at DESC').all(company_id)
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.transactions, 'utf-8'))
  return arr.filter(t => t.company_id == company_id).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function updateCompanyCredits(company_id, delta) {
  if (db) {
    const stmt = db.prepare('UPDATE companies SET credits = credits + ? WHERE id = ?')
    stmt.run(delta, company_id)
    return db.prepare('SELECT credits FROM companies WHERE id = ?').get(company_id)?.credits || 0
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.companies, 'utf-8'))
  const idx = arr.findIndex(c => c.id == company_id)
  if (idx >= 0) {
    arr[idx].credits = (arr[idx].credits || 0) + delta
    fs.writeFileSync(fallbacks.companies, JSON.stringify(arr, null, 2))
    return arr[idx].credits
  }
  return 0
}

// ---- Time Requests ----

export function createTimeRequest(data) {
  const { company_id, employee_id, date, start_time, end_time, reason } = data;
  const now = new Date().toISOString();
  if (db) {
    const stmt = db.prepare('INSERT INTO time_requests (company_id, employee_id, date, start_time, end_time, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(company_id, employee_id, date, start_time, end_time, reason, now);
    return { id: info.lastInsertRowid, ...data, status: 'pending', created_at: now };
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.requests, 'utf-8'));
  const id = (arr[arr.length - 1]?.id || 0) + 1;
  const record = { id, ...data, status: 'pending', created_at: now };
  arr.push(record);
  fs.writeFileSync(fallbacks.requests, JSON.stringify(arr, null, 2));
  return record;
}

export function getTimeRequests(company_id, employee_id = null) {
  if (db) {
    let sql = 'SELECT * FROM time_requests WHERE company_id = ?';
    const params = [company_id];
    if (employee_id) {
      sql += ' AND employee_id = ?';
      params.push(employee_id);
    }
    sql += ' ORDER BY created_at DESC';
    return db.prepare(sql).all(...params);
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.requests, 'utf-8'));
  return arr.filter(r => r.company_id == company_id && (!employee_id || r.employee_id == employee_id))
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function updateUserTimezone(email, timezone) {
  if (db) {
    const stmt = db.prepare('UPDATE users SET timezone = ? WHERE email = ?')
    stmt.run(timezone, email)
    return db.prepare('SELECT id, email, role, company_id, timezone, created_at FROM users WHERE email = ?').get(email)
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  const idx = arr.findIndex(u => String(u.email).toLowerCase() === String(email).toLowerCase())
  if (idx >= 0) {
    arr[idx].timezone = timezone
    fs.writeFileSync(fallbacks.users, JSON.stringify(arr, null, 2))
    const u = arr[idx]
    return { id: u.id, email: u.email, role: u.role, company_id: u.company_id, timezone: u.timezone, created_at: u.created_at }
  }
  return null
}

export function updateTimeRequestStatus(id, status, action_by) {
  const now = new Date().toISOString();
  if (db) {
    const stmt = db.prepare('UPDATE time_requests SET status = ?, action_by = ?, action_at = ? WHERE id = ?');
    stmt.run(status, action_by, now, id);
    return db.prepare('SELECT * FROM time_requests WHERE id = ?').get(id);
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.requests, 'utf-8'));
  const idx = arr.findIndex(r => r.id == id);
  if (idx >= 0) {
    arr[idx].status = status;
    arr[idx].action_by = action_by;
    arr[idx].action_at = now;
    fs.writeFileSync(fallbacks.requests, JSON.stringify(arr, null, 2));
    return arr[idx];
  }
  return null;
}

export function getTimeRequestById(id) {
  if (db) {
    return db.prepare('SELECT * FROM time_requests WHERE id = ?').get(id);
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.requests, 'utf-8'));
  return arr.find(r => r.id == id);
}

// Helper to get work sessions (currently reads from JSON directly in server.js but good to have here)
// For now, we return null as the server.js logic for work sessions is file-based and complex
export function getWorkSessions(userId, date) {
  // Placeholder implementation to satisfy export
  return [];
}
