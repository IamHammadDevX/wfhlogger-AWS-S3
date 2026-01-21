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
  companies: path.resolve(process.cwd(), DATA_DIR, 'companies.sqlite.json')
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
  `)
  
  // Migration: Ensure company_id column exists
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all()
    if (!tableInfo.find(c => c.name === 'company_id')) {
      db.exec("ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id)")
      console.log('[sqlite] Migrated users table: added company_id')
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
  if (db) {
    return db.prepare('SELECT * FROM companies WHERE id = ?').get(id)
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.companies, 'utf-8'))
  return arr.find(c => c.id == id)
}

export function createUser({ email, password, role, company_id }) {
  const hash = bcrypt.hashSync(password, 10)
  const now = new Date().toISOString()
  if (db) {
    const stmt = db.prepare('INSERT INTO users (email, password_hash, role, created_at, company_id) VALUES (?, ?, ?, ?, ?)')
    const info = stmt.run(email, hash, role, now, company_id || null)
    return { id: info.lastInsertRowid, email, role, created_at: now, company_id: company_id || null }
  }
  const arr = JSON.parse(fs.readFileSync(fallbacks.users, 'utf-8'))
  const id = (arr[arr.length - 1]?.id || 0) + 1
  const record = { id, email, password_hash: hash, role, created_at: now, company_id: company_id || null }
  arr.push(record)
  fs.writeFileSync(fallbacks.users, JSON.stringify(arr, null, 2))
  return { id, email, role, created_at: now, company_id: company_id || null }
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
      return { id: existing.id, email, company_id: existing.company_id }
    }
    const ins = db.prepare('INSERT INTO users (email, password_hash, role, created_at, company_id) VALUES (?, ?, ?, ?, ?)')
    const info = ins.run(email, hash, 'employee', now, company_id || null)
    return { id: info.lastInsertRowid, email, company_id: company_id || null }
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
    return { id: arr[idx].id, email, company_id: existing.company_id }
  }
  const id = (arr[arr.length - 1]?.id || 0) + 1
  const record = { id, email, password_hash: hash, role: 'employee', created_at: now, company_id: company_id || null }
  arr.push(record)
  fs.writeFileSync(fallbacks.users, JSON.stringify(arr, null, 2))
  return { id, email, company_id: company_id || null }
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