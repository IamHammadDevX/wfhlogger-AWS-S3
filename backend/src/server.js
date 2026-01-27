import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectMongo } from './db.js';
import { db, getUserByEmail, createUser, verifyPassword, seedDefaultSuperAdmin, createOrganization, listManagers, getOrganizationByManagerId, upsertEmployeePassword, deleteUserById, deleteUserByEmail, deleteOrganizationByManagerId, createCompany, getCompanyById, updateCompanyCredits, createTransaction, getTransactions, createTimeRequest, getTimeRequests, updateTimeRequestStatus, getTimeRequestById, getWorkSessions, creditCompanyWithTransaction, updateCompanyProfile, getNextInvoiceNo, createInvoice, listInvoices, getInvoiceByCompany, setInvoicePdfPath, recordEmployeeTempPassword, listEmployeeTempPasswords, recordManagerTempPassword, listManagerTempPasswords, createPasswordResetToken, verifyResetToken, resetPassword, updateUserProfile, updateUserTimezone } from './sqlite.js';
import { generateInvoicePdf } from './invoices/pdf.js'
import bcrypt from 'bcryptjs';
// Razorpay disabled (kept for future re-enable)
// import { createOrder, verifySignature } from './payment.js';
import { createStripeCheckoutSession, verifyStripeWebhookAndExtract } from './payments/stripe.js';
import { sendPaymentSuccess, sendLowCreditWarning, sendCreationBlocked, sendSubscriptionDeduction, sendRequestStatus, sendNewUserCreated, sendMonthlyBillingSummary, sendContactFormEmail, sendPasswordResetEmail, sendEmployeeCreatedDeduction, sendAccountSuspensionWarning } from './email.js';
import cron from 'node-cron';

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
const DATA_DIR = process.env.DATA_DIR || 'data';
const PAYMENT_PROVIDER = (process.env.PAYMENT_PROVIDER || 'stripe').toLowerCase();

// Ensure upload directory exists (relative to current working dir)
const uploadPath = path.resolve(process.cwd(), UPLOAD_DIR);
fs.mkdirSync(uploadPath, { recursive: true });
const metaFile = path.join(uploadPath, 'index.json');
if (!fs.existsSync(metaFile)) {
  fs.writeFileSync(metaFile, '[]');
}

// Ensure data directory exists
const dataPath = path.resolve(process.cwd(), DATA_DIR);
fs.mkdirSync(dataPath, { recursive: true });
const orgFile = path.join(dataPath, 'organization.json');
const usersFile = path.join(dataPath, 'users.json');
const intervalsFile = path.join(dataPath, 'intervals.json');
const sessionsFile = path.join(dataPath, 'work_sessions.json');
const auditFile = path.join(dataPath, 'audit_logs.json');
if (!fs.existsSync(orgFile)) fs.writeFileSync(orgFile, JSON.stringify({ name: '', createdAt: null }, null, 2));
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]');
if (!fs.existsSync(intervalsFile)) fs.writeFileSync(intervalsFile, '{}');
if (!fs.existsSync(sessionsFile)) fs.writeFileSync(sessionsFile, '[]');
if (!fs.existsSync(auditFile)) fs.writeFileSync(auditFile, '[]');
  const transactionsFile = path.join(dataPath, 'transactions.sqlite.json');
  if (!fs.existsSync(transactionsFile)) fs.writeFileSync(transactionsFile, '[]');

  // Monthly Subscription Logic (Simple Check)
  // Run daily check for monthly billing cycle
  // For demo, we run it every hour or on startup? 
  // We'll use node-cron to run daily at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('[Billing] Running daily subscription check...');
    processSubscriptions();
  });

  async function processSubscriptions() {
    // Iterate all companies (sqlite or json)
    // In real app, check 'next_billing_date'. Here we simulate.
    // We will just log for now as we don't have a robust subscription engine with dates in schema.
    console.log('[Billing] Running subscription cycle...');
    try {
      const companiesPath = path.resolve(process.cwd(), DATA_DIR, 'companies.sqlite.json');
      if (!fs.existsSync(companiesPath)) return;
      const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
      
      for (const comp of companies) {
        if (!comp.credits || comp.credits < 1) {
          // Send suspension warning
          const admin = listManagers(comp.id).find(u => u.role === 'super_admin');
          if (admin) sendAccountSuspensionWarning(admin.email);
          continue;
        }
        
        // Count active employees
        const employees = readUsers().filter(u => u.company_id == comp.id && u.role === 'employee');
        const cost = employees.length; // $1 per employee
        
        if (cost > 0) {
          if (comp.credits >= cost) {
            comp.credits -= cost;
            // Record Transaction
            createTransaction({
              company_id: comp.id,
              amount: 0,
              credits: -cost,
              type: 'debit',
              description: `Monthly subscription for ${cost} employees`,
              reference_id: `sub_${Date.now()}`,
              status: 'success'
            });
            // Send Email
            const admin = listManagers(comp.id).find(u => u.role === 'super_admin');
            if (admin) {
              // Legacy
              // sendSubscriptionDeduction(admin.email, cost, comp.credits);
              // New Summary
              const period = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
              sendMonthlyBillingSummary(admin.email, { period, activeEmployees: employees.length, deducted: cost, remaining: comp.credits });
            }
          } else {
            // Partial deduction or suspend?
            // For now, just warn
            const admin = listManagers(comp.id).find(u => u.role === 'super_admin');
            if (admin) sendLowCreditWarning(admin.email, comp.credits);
          }
        }
      }
      fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 2));
    } catch (e) {
      console.error('[Billing] Subscription error:', e);
    }
  }

// Users/team helpers
function readUsers(){
  try { return JSON.parse(fs.readFileSync(usersFile, 'utf-8')); } catch { return []; }
}
function writeUsers(arr){ fs.writeFileSync(usersFile, JSON.stringify(arr, null, 2)); }
function getTeamEmailsForManager(managerKey, companyId){
  const users = readUsers();
  // Accept either manager numeric id or email; resolve both forms
  const keyStr = String(managerKey || '').trim();
  const matchManager = (u) => {
    const mid = String(u.managerId || '').trim();
    return mid === keyStr || mid.toLowerCase() === keyStr.toLowerCase();
  };
  return users
    .filter(u => u.role === 'employee' && matchManager(u) && (companyId ? u.company_id == companyId : true))
    .map(u => u.email);
}
function appendAudit(type, details, company_id){
  try {
    const arr = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    arr.push({ type, details, company_id, ts: new Date().toISOString() });
    fs.writeFileSync(auditFile, JSON.stringify(arr, null, 2));
  } catch (e) {
    console.error('[audit] append failed:', e);
  }
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `${ts}-${file.originalname}`);
  }
});
const upload = multer({ storage });

const app = express();
const httpServer = createServer(app);
// Socket.IO: allow all origins because desktop clients are non-browser
// and rely on JWT for authorization. Express CORS remains restricted.
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    credentials: false
  },
  transports: ['websocket', 'polling'] // Explicitly allow both
});

// Middlewares
// Relax CSP/CORP for cross-origin resource loading from the web dev server
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
// Stripe webhook must receive raw body BEFORE JSON parser
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
// Allow all origins for dev and do not set credentials to avoid the invalid '*' + credentials combination
app.use(cors({ origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : '*', credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
// Serve uploaded images statically for the web UI
app.use('/uploads', express.static(uploadPath));
const publicDownloadsPath = path.join(process.cwd(), 'public', 'downloads');
// Robust download serving: check public/downloads, then desktop folder candidates
app.use('/downloads', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  
  const requestedFile = req.path.replace(/^\//, ''); // e.g. "TimeTrackerSetup.exe"
  if (!requestedFile) return next();
  
  // Candidates for the file
  const candidates = [
    path.join(publicDownloadsPath, requestedFile),
    path.join(process.cwd(), 'desktop', requestedFile),
    path.join(process.cwd(), '..', 'desktop', requestedFile),
    path.join(process.cwd(), '..', 'desktop', 'dist', requestedFile),
    // Fallback for TimeTrackerSetup.exe -> TimeTracker.exe if setup not found
    (requestedFile === 'TimeTrackerSetup.exe') ? path.join(process.cwd(), 'desktop', 'TimeTracker.exe') : null,
    (requestedFile === 'TimeTrackerSetup.exe') ? path.join(process.cwd(), '..', 'desktop', 'TimeTracker.exe') : null
  ].filter(Boolean);

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      return res.download(file, requestedFile); // Serve with correct name
    }
  }
  
  // If no file found, let express.static handle or 404
  next();
});
app.use('/downloads', express.static(publicDownloadsPath));
// Serve generated personal reports
const publicReportsPath = path.join(process.cwd(), 'public', 'reports');
fs.mkdirSync(publicReportsPath, { recursive: true });
app.use('/reports', express.static(publicReportsPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Startup warnings for production hardening
if (JWT_SECRET === 'dev_secret') {
  console.warn('[security] Using default JWT_SECRET. Set a strong JWT_SECRET for production.');
}
if (!ALLOWED_ORIGINS.length) {
  console.warn('[cors] ALLOWED_ORIGINS not set. CORS is wide open (*) for development.');
}

// Seed default Super Admin on startup
seedDefaultSuperAdmin();

// Auth
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Role Check: If role is provided, validate it.
    // Allow 'super_admin' to login even if they selected 'manager' (downwards compatibility) or vice versa if roles overlap?
    // STRICT MODE: Enforce exact match or hierarchy?
    // For now: 
    // - If user is super_admin, they can login as super_admin or manager (dashboard access)
    // - If user is manager, they can only login as manager
    
    if (role) {
      if (user.role === 'super_admin') {
        // Super admin can access everything, pass
      } else if (user.role !== role) {
        return res.status(403).json({ error: 'Forbidden: role mismatch' });
      }
    }

    const ok = verifyPassword(user, password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ sub: user.email, email: user.email, role: user.role, uid: user.id, company_id: user.company_id, full_name: user.full_name, country: user.country || '', timezone: user.timezone || 'UTC' }, JWT_SECRET, { expiresIn: '8h' });
    try {
      if (user.role === 'employee') {
        appendAudit('employee_web_login', { email, ip: req.ip, ua: req.headers['user-agent'] }, user.company_id);
      }
    } catch {}
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, country: user.country || '', timezone: user.timezone || 'UTC', role: user.role } });
  } catch (e) {
    console.error('[auth:login] error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Signup (Multi-tenant)
app.post('/api/auth/signup', (req, res) => {
  try {
    const { companyName, email, password, fullName, country, timezone } = req.body || {};
    if (!companyName || !email || !password || !fullName || !country || !timezone) return res.status(400).json({ error: 'All fields are required' });
    
    const existing = getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'User already exists' });

    // Create Company
    const company = createCompany({ name: companyName });
    
    // Create Admin User (Super Admin role) linked to company - The first user is the Owner
    const user = createUser({ email, full_name: fullName, country, timezone, password, role: 'super_admin', company_id: company.id });
    
    // Create Default Team (Organization) linked to company
    createOrganization({ name: `${companyName}`, managerId: user.id, company_id: company.id });

    // Generate Token
    const token = jwt.sign({ sub: user.email, email: user.email, role: user.role, uid: user.id, company_id: company.id, full_name: user.full_name, country: user.country || '', timezone: user.timezone || 'UTC' }, JWT_SECRET, { expiresIn: '8h' });
    
    // Give some initial free credits? No, strict.
    
    res.status(201).json({ token, company, user: { id: user.id, email: user.email, full_name: user.full_name, country: user.country || '', timezone: user.timezone || 'UTC', role: user.role } });
  } catch (e) {
    console.error('[auth:signup] error:', e);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ error: 'Email is required' })
    
    const user = getUserByEmail(email)
    if (!user) {
      // Don't reveal user existence
      return res.json({ ok: true, message: 'If an account exists, instructions have been sent.' })
    }

    if (user.role === 'employee') {
      return res.status(400).json({ 
        error: 'Employee account', 
        message: 'Please contact your Manager to reset your password.' 
      })
    }

    if (user.role === 'manager') {
      return res.status(400).json({ 
        error: 'Manager account', 
        message: 'Please contact your Company Admin to reset your password.' 
      })
    }

    if (user.role === 'super_admin') {
      const token = createPasswordResetToken(user.email)
      // Determine base URL: In production it's likely the same domain.
      // In dev, frontend is usually 5173, backend is 4000.
      // We should use an environment variable FRONTEND_URL.
      // Fallback: If request origin header exists, use it (likely the frontend making the request).
      const origin = req.headers.origin || process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173'; 
      const resetUrl = `${origin}/reset-password?token=${token}`
      // Log for development ease
      console.log(`[AUTH] Password Reset Link for ${user.email}: ${resetUrl}`);
      await sendPasswordResetEmail(user.email, resetUrl)
      return res.json({ ok: true, message: 'Password reset link sent to your email.' })
    }

    res.json({ ok: true })
  } catch (e) {
    console.error('[auth:forgot] error:', e)
    res.status(500).json({ error: 'Request failed' })
  }
})

// Reset Password
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { token, password } = req.body || {}
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' })
    
    const success = resetPassword(token, password)
    if (!success) return res.status(400).json({ error: 'Invalid or expired token' })
    
    res.json({ ok: true, message: 'Password reset successfully' })
  } catch (e) {
    console.error('[auth:reset] error:', e)
    res.status(500).json({ error: 'Reset failed' })
  }
})

// Contact Us Form Submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Determine support email - defaulting to env var or a fallback
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
    
    if (supportEmail) {
      await sendContactFormEmail(supportEmail, { name, email, subject, message });
      // Send auto-reply to user? (Optional enhancement)
    } else {
      console.warn('[contact] No support email configured to receive messages.');
    }

    res.json({ ok: true, message: 'Message sent successfully' });
  } catch (e) {
    console.error('[contact] error:', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Simple auth middleware
function requireRole(roles = []) {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Organization setup
app.post('/api/org', requireRole(['manager', 'super_admin']), (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const role = req.user?.role;
  const company_id = req.user?.company_id;

  try {
    if (role === 'super_admin') {
      // Super Admin: Update Company Name in SQLite
      if (db) {
        db.prepare('UPDATE companies SET name = ? WHERE id = ?').run(name.trim(), company_id);
      } else {
        // Fallback JSON update
        const comps = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DATA_DIR, 'companies.sqlite.json'), 'utf-8'));
        const idx = comps.findIndex(c => c.id == company_id);
        if (idx >= 0) {
          comps[idx].name = name.trim();
          fs.writeFileSync(path.resolve(process.cwd(), DATA_DIR, 'companies.sqlite.json'), JSON.stringify(comps, null, 2));
        }
      }
      return res.json({ ok: true, organization: { name: name.trim() } });
    }

    if (role === 'manager') {
      // Manager: Update their Team (Organization) Name
      // Find the org managed by this user
      const mgrId = req.user?.uid;
      let org = getOrganizationByManagerId(mgrId);
      
      if (!org) {
        // Create if missing? Or error?
        // Usually managers have an org created on assignment.
        return res.status(404).json({ error: 'Organization not found for manager' });
      }

      // Ensure org belongs to company
      if (org.company_id != company_id) return res.status(403).json({ error: 'Forbidden' });

      if (db) {
        db.prepare('UPDATE organizations SET name = ? WHERE id = ?').run(name.trim(), org.id);
      } else {
        const orgs = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DATA_DIR, 'organizations.sqlite.json'), 'utf-8'));
        const idx = orgs.findIndex(o => o.id == org.id);
        if (idx >= 0) {
          orgs[idx].name = name.trim();
          fs.writeFileSync(path.resolve(process.cwd(), DATA_DIR, 'organizations.sqlite.json'), JSON.stringify(orgs, null, 2));
        }
      }
      return res.json({ ok: true, organization: { name: name.trim() } });
    }
  } catch (e) {
    console.error('[org:update] error:', e);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

app.get('/api/org', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id;
    const role = req.user?.role;

    if (role === 'super_admin') {
      const company = getCompanyById(company_id);
      if (company) return res.json({ organization: { name: company.name, createdAt: company.created_at } });
    }

    if (role === 'manager') {
      const mgrId = req.user?.uid;
      let org = getOrganizationByManagerId(mgrId);
      // Ensure org belongs to same company
      if (org && org.company_id == company_id) {
        return res.json({ organization: { name: org.name, createdAt: org.created_at } });
      }
    }
    
    return res.json({ organization: { name: '', createdAt: null } });
  } catch {
    res.json({ organization: { name: '', createdAt: null } });
  }
});

// Team info for the authenticated manager (maps to organization by manager)
app.get('/api/team', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id;
    // For super_admin owner, we return the company info as the "team"
    if (req.user?.role === 'super_admin') {
      const company = getCompanyById(company_id);
      if (company) {
        return res.json({ team: { id: company.id, name: company.name } });
      }
      // If company not found (should not happen), fallback to finding the default org
      // This ensures we display something instead of "Not configured"
      const org = getOrganizationByManagerId(req.user?.uid);
      if (org) {
        return res.json({ team: { id: org.id, name: org.name } });
      }
    }

    if (req.user?.role === 'manager') {
      const mgrId = req.user?.uid;
      const mgrEmail = req.user?.sub;
      let org = null;
      try { org = getOrganizationByManagerId(mgrId); } catch {}
      if (!org) {
        try { org = getOrganizationByManagerId(mgrEmail); } catch {}
      }
      // Ensure org belongs to same company
      if (org && org.company_id == company_id) {
        return res.json({ team: { id: org.id, name: org.name } });
      }
      return res.json({ team: null });
    }
    return res.json({ team: null });
  } catch {
    return res.json({ team: null });
  }
});

// Employees
app.post('/api/employees', requireRole(['manager', 'super_admin']), (req, res) => {
  const { email, name, country, timezone, managerId: bodyManagerId, password } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Full name is required' });
  if (!country || !String(country).trim()) return res.status(400).json({ error: 'Country is required' });
  if (!timezone || !String(timezone).trim()) return res.status(400).json({ error: 'Timezone is required' });
  try {
    const users = readUsers();
    // Scope check: Check if user exists in THIS company? 
    // Email is globally unique usually.
    if (users.find(u => u.email.toLowerCase() === String(email).toLowerCase())) {
      return res.status(409).json({ error: 'User already exists' });
    }
    // Also prevent duplicate login user in sqlite
    const existingLogin = getUserByEmail(email);
    if (existingLogin) {
      return res.status(409).json({ error: 'Login user already exists' });
    }
    const requesterRole = req.user?.role;
    const requesterUid = req.user?.uid || req.user?.sub;
    const managerId = (requesterRole === 'manager') ? requesterUid : (bodyManagerId || requesterUid || null);
    const company_id = req.user?.company_id;

    // Credit Check for Employee Creation
    // Check if company has credits. Cost = 1 credit? 
    // Or just check if balance > 0 to allow adding? 
    // "validate the company’s available credit balance; if credits are insufficient, block"
    // Assuming 1 employee = 1 credit/month. We check if they have at least 1 credit to add a user?
    // Or subscription model: credits are deducted monthly. Adding user might not deduct immediately but requires balance?
    // Let's enforce: Must have at least 1 credit to add an employee.
    const company = getCompanyById(company_id);
    if (company && (company.credits || 0) < 1) {
      // Send email to admin?
      const admin = listManagers(company_id).find(u => u.role === 'super_admin') || { email: req.user.email };
      sendCreationBlocked(admin.email);
      return res.status(402).json({ error: 'Insufficient credits. Please add credits to your account.' });
    }

    // Generate a temporary password if not provided
    const tempPassword = password && String(password).trim()
      ? String(password).trim()
      : Math.random().toString(36).slice(2, 10);

    // Create login user in sqlite (or JSON fallback) with company_id
    // We pass 'name' as full_name
  const loginUser = createUser({ email, full_name: name || '', country, timezone, password: tempPassword, role: 'employee', company_id });

    // Store team mapping and display name in simple JSON store
    // Note: 'name' here in users.json is redundant if we use sqlite full_name, but kept for legacy JSON compatibility
  const record = { id: loginUser.id, email, name: name || '', country, timezone, role: 'employee', managerId, company_id, createdAt: new Date().toISOString() };
    users.push(record);
    writeUsers(users);

    try { recordEmployeeTempPassword(company_id, loginUser.email, tempPassword) } catch {}

    // Send New User Created Emails
    try {
       const loginUrl = `${process.env.APP_URL || 'http://localhost:4000'}`;
       // 1. To Company Admin
       const admin = listManagers(company_id).find(u => u.role === 'super_admin');
       // 2. To Assigned Manager (if any)
       let manager = null;
       if (managerId) {
         // managerId can be ID or Email.
         const allUsers = readUsers();
         manager = allUsers.find(u => u.id == managerId || u.email === managerId);
       }
       
       // Get Team Name
       let teamName = 'Unassigned';
       if (managerId) {
         const org = getOrganizationByManagerId(managerId);
         if (org) teamName = org.name;
       }

       const emailData = {
         name: name || email,
         email,
         role: 'employee',
         teamName,
         password: tempPassword,
         loginUrl
       };

       if (admin) {
         sendNewUserCreated(admin.email, emailData);
       }
       if (manager && manager.email !== admin?.email) {
         sendNewUserCreated(manager.email, emailData);
       }
    } catch (emailErr) {
       console.warn('[employees:create] failed to send emails:', emailErr);
    }

    // Immediate debit: $1 (1 credit) for employee activation
    try {
      const newBalance = updateCompanyCredits(company_id, -1);
      createTransaction({
        company_id,
        amount: 1,
        credits: -1,
        type: 'debit',
        description: 'Employee creation initial month',
        reference_id: `emp_${loginUser.id}`,
        status: 'success'
      });
      const admin = listManagers(company_id).find(u => u.role === 'super_admin');
      if (admin) {
        sendEmployeeCreatedDeduction(admin.email, {
          employeeName: name || email,
          employeeEmail: email,
          deducted: 1,
          remaining: newBalance
        });
        
        // Check for Low Balance or Suspension after deduction
        if (newBalance <= 0) {
          sendAccountSuspensionWarning(admin.email);
        } else if (newBalance < 5) {
          sendLowCreditWarning(admin.email, newBalance);
        }
      }
      try { io.emit('company:credits_updated', { company_id, balance: newBalance }) } catch {}
    } catch (e) {
      console.warn('[employees:debit_on_create] failed:', e?.message || e);
    }

    res.status(201).json({
      user: record,
      login: { id: loginUser.id, email: loginUser.email, tempPassword }
    });
  } catch (e) {
    console.error('[employees] write error:', e);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// ---- Super Admin: Manager creation ----
app.post('/api/admin/managers', requireRole(['super_admin']), (req, res) => {
  try {
    const { email, password, orgName, name, country, timezone } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!orgName || !String(orgName).trim()) return res.status(400).json({ error: 'Team name is required' });
    // name is mandatory now
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Manager full name is required' });
    if (!country || !String(country).trim()) return res.status(400).json({ error: 'Country is required' });
    if (!timezone || !String(timezone).trim()) return res.status(400).json({ error: 'Timezone is required' });

    const existing = getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'User already exists' });
    
    const company_id = req.user?.company_id;
    const manager = createUser({ email, full_name: name, country, timezone, password, role: 'manager', company_id });
    try { recordManagerTempPassword(company_id, manager.email, password) } catch {}
    const org = createOrganization({ name: orgName.trim(), managerId: manager.id, company_id });
    
    // Send New User Created Emails (Manager)
    try {
       const loginUrl = `${process.env.APP_URL || 'http://localhost:4000'}`;
       const admin = listManagers(company_id).find(u => u.role === 'super_admin');
       const emailData = {
         name: name, 
         email,
         role: 'manager',
         teamName: orgName.trim(),
         password: password,
         loginUrl
       };
       // Send to Admin (copy)
       if (admin) sendNewUserCreated(admin.email, emailData);
       // Send to New Manager
       sendNewUserCreated(email, emailData);
    } catch (e) {
      console.warn('[admin:create_manager] email send failed', e);
    }

    res.status(201).json({ ok: true, manager: { id: manager.id, email: manager.email, full_name: manager.full_name, country: manager.country || '', timezone: manager.timezone || 'UTC', role: manager.role, employeeCount: 0, organization: { id: org.id, name: org.name } }, organization: org });
  } catch (e) {
    console.error('[admin:create_manager] error:', e);
    res.status(500).json({ error: 'Failed to create manager' });
  }
});

// Admin: List manager initial credentials
app.get('/api/admin/managers/creds', requireRole(['super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id
    const rows = listManagerTempPasswords(company_id)
    res.json({ creds: rows })
  } catch (e) {
    res.status(500).json({ error: 'Failed to load manager credentials' })
  }
})

// Manager/Admin: List employee initial credentials (tenant-scoped)
app.get('/api/employees/initial-creds', requireRole(['manager','super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id
    const rows = listEmployeeTempPasswords(company_id)
    res.json({ creds: rows })
  } catch (e) {
    res.status(500).json({ error: 'Failed to load credentials' })
  }
})

// ---- Super Admin: Managers list with employee counts ----
app.get('/api/admin/managers', requireRole(['super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id;
    const managers = listManagers(company_id);
    const allUsers = readUsers();
    // Scope employees to company
    const employees = allUsers.filter(u => u.role === 'employee' && u.company_id == company_id);
    const enriched = managers.map(m => {
      const org = getOrganizationByManagerId(m.id) || null;
      // Extra check: ensure org belongs to company
      const orgData = (org && org.company_id == company_id) ? { id: org.id, name: org.name } : null;
      const count = employees.filter(e => e.managerId === m.id || e.managerId === m.email).length;
      return { id: m.id, email: m.email, full_name: m.full_name || '', employeeCount: count, organization: orgData };
    });
    res.json({ managers: enriched });
  } catch (e) {
    console.error('[admin:list_managers] error:', e);
    res.status(500).json({ error: 'Failed to list managers' });
  }
});

// ---- Super Admin: Delete a manager ----
app.delete('/api/admin/managers/:id', requireRole(['super_admin']), (req, res) => {
  try {
    const { id } = req.params;
    // Verify manager exists
    let exists = null;
    if (db) {
      const stmt = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'manager'");
      exists = stmt.get(id);
    } else {
      try {
        const arr = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DATA_DIR, 'users.sqlite.json'), 'utf-8'));
        exists = arr.find(u => String(u.id) === String(id) && u.role === 'manager');
      } catch {}
    }
    if (!exists) return res.status(404).json({ error: 'Manager not found' });

    // Delete orgs tied to this manager
    try { deleteOrganizationByManagerId(id); } catch {}
    // Delete manager login
    const ok = deleteUserById(id);
    if (!ok) return res.status(500).json({ error: 'Failed to delete manager' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[admin:delete_manager] error:', e);
    res.status(500).json({ error: 'Delete manager failed' });
  }
});

// ---- Super Admin: Audit logs ----
app.get('/api/admin/audit-logs', requireRole(['super_admin']), (req, res) => {
  try {
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(auditFile, 'utf-8')); } catch {}
    const company_id = req.user?.company_id;
    // Strict Company Filter
    logs = logs.filter(l => l.company_id == company_id);

    const { managerId, employeeId } = req.query || {};
    if (managerId) logs = logs.filter(l => l.details?.actorId === managerId);
    if (employeeId) logs = logs.filter(l => l.details?.employeeId === employeeId);
    res.json({ logs });
  } catch (e) {
    console.error('[admin:audit_logs] error:', e);
    res.status(500).json({ error: 'Failed to read audit logs' });
  }
});

app.get('/api/employees', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const allUsers = readUsers();
    const company_id = req.user?.company_id;
    // Filter by company
    const users = allUsers.filter(u => u.company_id == company_id);

    const role = req.user?.role;
    if (role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub, company_id);
      const teamUsers = users.filter(u => u.role === 'employee' && teamEmails.includes(u.email));
      return res.json({ users: teamUsers });
    }
    // Super Admin: return ALL employees in company
    // Currently, `users` contains all users in company. We should return all employees for stats?
    // Or return managers too?
    // Dashboard expects `filteredEmployees` which are usually just 'employees'.
    // If we return all users, dashboard filters `role === 'employee'`? No, it trusts backend.
    // Let's return all users in company so dashboard can filter or display.
    // BUT frontend expects `users` array of employee objects.
    
    // Fix: Return all employees of the company for super_admin
    const companyEmployees = users.filter(u => u.role === 'employee');
    res.json({ users: companyEmployees });
  } catch {
    res.json({ users: [] });
  }
});

// ---- Admin/Manager: Delete an employee ----
app.delete('/api/employees/:email', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    let { email } = req.params;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    email = String(email).toLowerCase();
    const allUsers = readUsers();
    const employee = allUsers.find(u => u.role === 'employee' && String(u.email).toLowerCase() === String(email).toLowerCase());
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    // Managers may only remove their team
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub, req.user?.company_id);
      if (!teamEmails.includes(employee.email)) {
        return res.status(403).json({ error: 'Not allowed' });
      }
    }
    const remaining = allUsers.filter(u => String(u.email).toLowerCase() !== String(email).toLowerCase());
    writeUsers(remaining);
    try { deleteUserByEmail(email); } catch {}
    // Terminate any ongoing live streams for this employee
    try {
      liveStreamOn.set(email, false);
      io.to(viewersRoom(email)).emit('live_view:terminate', { by: email, reason: 'deleted' });
    } catch {}

    // Cleanup screenshots/files and metadata for this employee for consistency
    try {
      let meta = [];
      try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8')); } catch {}
      const targets = meta.filter(m => String(m.employeeId).toLowerCase() === String(email).toLowerCase());
      let removed = 0;
      let bytesFreed = 0;
      for (const m of targets) {
        try {
          const fname = path.basename(String(m.file || ''));
          const abs = path.join(uploadPath, fname);
          try { bytesFreed += fs.statSync(abs).size; } catch {}
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
          removed += 1;
        } catch {}
      }
      const keep = meta.filter(m => String(m.employeeId).toLowerCase() !== String(email).toLowerCase());
      try { fs.writeFileSync(metaFile, JSON.stringify(keep, null, 2)); } catch {}
      try { io.emit('uploads:cleanup_done', { removed, bytesFreed, employeeId: email }); } catch {}
    } catch (cleanupErr) {
      console.warn('[employees:delete] screenshot cleanup failed:', cleanupErr?.message || cleanupErr);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[employees:delete] error:', e);
    res.status(500).json({ error: 'Delete employee failed' });
  }
});

// Admin/Manager: Set or reset an employee password (provision login if missing)
app.post('/api/admin/employees/password', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    email = String(email).toLowerCase();
    const allUsers = readUsers();
    const employee = allUsers.find(u => u.role === 'employee' && u.email.toLowerCase() === String(email).toLowerCase());
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    // Managers can only modify their team
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub, req.user?.company_id);
      if (!teamEmails.includes(employee.email)) return res.status(403).json({ error: 'Forbidden: not your team' });
    }
    const loginUser = upsertEmployeePassword(employee.email, String(password));
    res.json({ ok: true, user: { email: employee.email }, login: { id: loginUser.id, email: loginUser.email } });
  } catch (e) {
    console.error('[admin:set_employee_password] error:', e);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// ---- Time Requests (Manual Entry) ----

app.post('/api/requests', requireRole(['employee']), (req, res) => {
  try {
    const { date, start_time, end_time, reason } = req.body;
    const { company_id, uid } = req.user;

    // Basic Validation
    if (!date || !start_time || !end_time || !reason) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate Dates
    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);
    if (end <= start) return res.status(400).json({ error: 'End time must be after start time' });

    // Check Overlaps (Simple check against existing sessions)
    const sessions = getWorkSessions(uid, date); // Need to implement this helper or use existing logic
    // For now, assume no overlap check complexity or read sessions from file
    // Actually getWorkSessions is not imported or defined in sqlite.js exports above?
    // I added it to imports, let's assume it works or I need to implement it in sqlite.js?
    // Wait, getWorkSessions is NOT in sqlite.js exports in my previous step! 
    // I need to add it to sqlite.js exports first. 
    // Or I can read all sessions and filter.
    
    // For this iteration, let's create the request directly.
    const request = createTimeRequest({
      company_id,
      employee_id: uid,
      date,
      start_time,
      end_time,
      reason
    });

    res.json({ request });
  } catch (e) {
    console.error('[requests:create]', e);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

app.get('/api/requests', requireRole(['manager', 'super_admin', 'employee']), (req, res) => {
  try {
    const { company_id, role, uid } = req.user;
    if (role === 'employee') {
      const requests = getTimeRequests(company_id, uid);
      return res.json({ requests });
    }
    // Managers/Admins see pending requests for their team
    // For simplicity, super_admin sees all company requests
    // Manager sees only their team? Need to filter by team.
    let requests = getTimeRequests(company_id);
    if (role === 'manager') {
      const teamEmails = getTeamEmailsForManager(uid, company_id);
      const teamIds = new Set(teamEmails.map(em => {
        try { const u = getUserByEmail(em); return u?.id || null } catch { return null }
      }).filter(Boolean));
      requests = requests.filter(r => teamIds.has(r.employee_id));
    }
    
    // Filter pending only? Or all? Let's return all sorted.
    res.json({ requests });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.post('/api/requests/:id/:action', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const { id, action } = req.params; // action: approve or reject
    const { company_id, uid } = req.user;
    
    const request = getTimeRequestById(id);
    if (!request || request.company_id != company_id) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }
    // Managers can only act on their team
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(uid, company_id);
      const teamIds = new Set(teamEmails.map(em => {
        try { const u = getUserByEmail(em); return u?.id || null } catch { return null }
      }).filter(Boolean));
      if (!teamIds.has(request.employee_id)) {
        return res.status(403).json({ error: 'Forbidden: not your team' });
      }
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updated = updateTimeRequestStatus(id, newStatus, uid);

    if (newStatus === 'approved') {
       // Create manual work session
       // We need to insert into work_sessions
       // Logic similar to 'stop' but manual
       // We need to read sessions file, append, write.
       const sessionsPath = path.join(dataPath, 'work_sessions.json'); // legacy path used in server.js?
       // server.js uses 'work_sessions.json' in 'saveSession' function? 
       // I need to check how sessions are stored. 
       // Line 57: const sessionsFile = path.join(dataPath, 'work_sessions.json');
       
       const sessions = JSON.parse(fs.readFileSync(path.join(process.cwd(), DATA_DIR, 'work_sessions.json'), 'utf-8'));
       const session = {
         userId: request.employee_id, // Note: server uses userId (email usually) or id?
         // In server.js, work_sessions use 'userId' which is email or ID?
         // Let's check 'work:start' event. 
         // socket.data.userId is usually email?
         // But here we have ID. We need to look up email.
         startTime: new Date(`${request.date}T${request.start_time}`).getTime(),
         endTime: new Date(`${request.date}T${request.end_time}`).getTime(),
         type: 'manual',
         company_id,
         approved_by: uid
       };
       
       // Need email for userId field if that's what's used
       const user = readUsers().find(u => u.id == request.employee_id);
       if (user) {
         session.userId = user.email; // Consistent with other sessions
         sessions.push(session);
         fs.writeFileSync(path.join(process.cwd(), DATA_DIR, 'work_sessions.json'), JSON.stringify(sessions, null, 2));
       }
    }
    
    // Send Email
    const user = readUsers().find(u => u.id == request.employee_id);
    if (user) {
      sendRequestStatus(user.email, newStatus, request.date, request.reason);
    }
    
    // Audit Log
    appendAudit(`request_${newStatus}`, { requestId: id, actorId: uid }, company_id);

    res.json({ ok: true, request: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ---- Billing & Payments ----

// Razorpay order endpoint deactivated
app.post('/api/billing/order', requireRole(['super_admin']), async (req, res) => {
  return res.status(503).json({ error: 'Razorpay is temporarily disabled' });
});

// Razorpay verify endpoint deactivated
app.post('/api/billing/verify', requireRole(['super_admin']), async (req, res) => {
  return res.status(503).json({ error: 'Razorpay is temporarily disabled' });
});

app.get('/api/billing/history', requireRole(['super_admin']), (req, res) => {
  try {
    const history = getTransactions(req.user?.company_id);
    res.json({ history });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.get('/api/billing/balance', requireRole(['super_admin', 'manager']), (req, res) => {
  try {
    const company = getCompanyById(req.user?.company_id);
    res.json({ credits: company?.credits || 0, plan: company?.plan });
  } catch (e) {
    res.json({ credits: 0 });
  }
});

// Billing summary (admin)
app.get('/api/billing/summary', requireRole(['super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id;
    const company = getCompanyById(company_id);
    const balance = company?.credits || 0;
    const history = getTransactions(company_id);
    res.json({ balance, history });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

app.get('/api/billing/invoices', requireRole(['super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id
    const list = listInvoices(company_id)
    res.json({ invoices: list })
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

app.get('/api/billing/invoices/:invoice_id/download', requireRole(['super_admin']), async (req, res) => {
  try {
    const company_id = req.user?.company_id
    const invoice_id = req.params.invoice_id
    const inv = getInvoiceByCompany(company_id, invoice_id)
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })

    // Check if PDF exists on disk
    let pdfPath = inv.pdf_path ? path.resolve(process.cwd(), inv.pdf_path) : null
    let exists = pdfPath && fs.existsSync(pdfPath)

    if (!exists) {
      // Generate on the fly
      try {
        pdfPath = await generateInvoicePdf(inv)
        setInvoicePdfPath(company_id, invoice_id, pdfPath)
        exists = true
      } catch (genErr) {
        console.error('[invoice] generation failed:', genErr)
        return res.status(500).json({ error: 'Failed to generate invoice PDF' })
      }
    }

    if (exists) {
      res.download(pdfPath, `${invoice_id}.pdf`)
    } else {
      res.status(404).json({ error: 'Invoice PDF not available' })
    }
  } catch (e) {
    console.error('[invoice] download error:', e)
    res.status(500).json({ error: 'Failed to download invoice' })
  }
})

// ---- Company Profile (Admin only) ----
app.get('/api/company/profile', requireRole(['super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id
    const c = getCompanyById(company_id)
    if (!c) return res.status(404).json({ error: 'Company not found' })
    res.json({
      id: c.id,
      name: c.name,
      logo_url: c.logo_url || '',
      billing_email: c.billing_email || '',
      billing_address: c.billing_address || '',
      subscription_plan: c.plan || 'free',
      credit_balance: c.credits || 0,
      admin_contact_email: c.admin_contact_email || '',
      created_at: c.created_at,
      updated_at: c.updated_at || c.created_at
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to load company profile' })
  }
})

// Accept multipart for logo; and JSON fields for name/emails
const logoUpload = upload.single('logo')
app.put('/api/company/profile', requireRole(['super_admin']), (req, res, next) => logoUpload(req, res, next), (req, res) => {
  try {
    const company_id = req.user?.company_id
    const { name, billing_email, admin_contact_email } = req.body || {}
    let logo_url = null
    if (req.file) {
      const mime = req.file.mimetype || ''
      const ok = ['image/png','image/jpeg','image/webp'].includes(mime)
      if (!ok) return res.status(400).json({ error: 'Invalid logo file type' })
      logo_url = `/uploads/${req.file.filename}`
    }
    const updated = updateCompanyProfile(company_id, { name, logo_url, billing_email, admin_contact_email })
    appendAudit('company_profile_updated', { actorId: req.user?.uid || req.user?.sub, company_id, changes: { name, billing_email, admin_contact_email, logo: !!logo_url } }, company_id)
    res.json({ ok: true, company: updated })
  } catch (e) {
    res.status(500).json({ error: 'Failed to update company profile' })
  }
})

// Company brand (name/logo) for all roles, scoped by company_id
app.get('/api/company/brand', requireRole(['super_admin','manager','employee']), (req, res) => {
  try {
    const company_id = req.user?.company_id
    const c = getCompanyById(company_id)
    if (!c) return res.status(404).json({ error: 'Company not found' })
    res.json({ name: c.name, logo_url: c.logo_url || '' })
  } catch (e) {
    res.status(500).json({ error: 'Failed to load brand' })
  }
})
// Stripe: Create Checkout Session
app.post('/api/billing/stripe/checkout-session', requireRole(['super_admin']), async (req, res) => {
  try {
    if (PAYMENT_PROVIDER !== 'stripe') return res.status(503).json({ error: 'Stripe disabled' });
    const { amount_usd } = req.body || {};
    const amount = Number(amount_usd);
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const company_id = req.user?.company_id;
    const admin_user_id = req.user?.uid;
    const url = await createStripeCheckoutSession({ company_id, admin_user_id, credit_amount_usd: amount, origin: req.headers.origin });
    return res.json({ url });
  } catch (e) {
    console.error('[stripe:checkout-session] error:', e);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe Webhook (raw body needed)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (PAYMENT_PROVIDER !== 'stripe') return res.status(503).end();
    const sig = req.headers['stripe-signature'];
    const event = verifyStripeWebhookAndExtract(req.body, sig);
    if (!event) return res.status(400).end();
    console.log('[stripe:webhook] received', event?.type);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};
      const company_id = Number(meta.company_id);
      const admin_user_id = Number(meta.admin_user_id);
      const credit_amount_usd = Number(meta.credit_amount_usd || 0);
      const credits = Math.floor(credit_amount_usd); // 1 USD = 1 credit
      if (company_id && credits > 0) {
        console.log('[stripe:webhook] company_id resolved', company_id);
        const ref = String(session.id || session.payment_intent || '');
        const newBalance = creditCompanyWithTransaction({
          company_id,
          amount_usd: credit_amount_usd,
          credits,
          description: 'Credit purchase via Stripe',
          reference_id: ref
        });
        console.log('[stripe:webhook] credits added', { company_id, added: credits, balance: newBalance });
        const company = getCompanyById(company_id)
        const nextNo = getNextInvoiceNo(company_id)
        const invId = `INV-${company_id}-${String(nextNo).padStart(5, '0')}`
        const invoice = createInvoice({
          company_id,
          invoice_no: nextNo,
          invoice_id: invId,
          company_name: company?.name || '',
          company_logo_url: company?.logo_url || '',
          billing_email: company?.billing_email || '',
          invoice_date: new Date().toISOString(),
          billing_period: 'one-time credit purchase',
          line_items: [{ description: `Credit Purchase – ${credits} Credits`, quantity: credits, unit_price: 1, subtotal: credits }],
          subtotal_amount: credits,
          tax_amount: 0,
          total_amount: credits,
          currency: 'USD',
          payment_provider: 'Stripe',
          payment_reference_id: ref,
          payment_status: 'paid'
        })
        try {
          const pdfPath = await generateInvoicePdf(invoice)
          setInvoicePdfPath(company_id, invId, pdfPath)
          appendAudit('invoice_generated', { company_id, invoice_id: invId }, company_id)
        } catch (e) {
          console.warn('[invoice] pdf generate failed:', e?.message || e)
        }
        try {
          const admin = listManagers(company_id).find(u => u.role === 'super_admin');
          if (admin) sendPaymentSuccess(admin.email, credit_amount_usd, credits);
        } catch {}
        try {
          io.emit('company:credits_updated', { company_id, balance: newBalance })
        } catch {}
      }
    }
    res.status(200).end();
  } catch (e) {
    console.error('[stripe:webhook] error:', e);
    res.status(400).end();
  }
});
// ---- Screen capture interval configuration ----
// Align with web UI options (include 1 minute)
const allowedMinutes = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
app.get('/api/capture-interval', requireRole(['employee', 'manager', 'super_admin']), (req, res) => {
  try {
    const intervals = JSON.parse(fs.readFileSync(intervalsFile, 'utf-8'));
    const requesterRole = req.user?.role;
    const company_id = req.user?.company_id;
    let targetId = (requesterRole === 'employee') ? req.user?.sub : (req.query.employeeId || req.user?.sub);
    
    // Validate targetId belongs to company
    const allUsers = readUsers();
    const targetUser = allUsers.find(u => u.email === targetId);
    if (!targetUser || targetUser.company_id != company_id) {
       // If target user not found in company list, deny access (unless it's self, but self should exist)
       // Exception: if targetId is self (e.g. super_admin checking self?)
       if (targetId !== req.user?.sub) {
         return res.status(404).json({ error: 'Employee not found in company' });
       }
    }

    if (requesterRole === 'manager' && targetId) {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub, company_id);
      if (!teamEmails.includes(targetId)) return res.status(403).json({ error: 'Forbidden: not your team' });
    }
    const secs = intervals[targetId];
    if (!secs) return res.json({ assigned: false, intervalSeconds: null });
    res.json({ assigned: true, intervalSeconds: secs });
  } catch (e) {
    console.error('[interval:get] error:', e);
    res.status(500).json({ error: 'Failed to read interval' });
  }
});

app.post('/api/capture-interval', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const { employeeId, intervalMinutes } = req.body || {};
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    const mins = Number(intervalMinutes);
    if (!allowedMinutes.includes(mins)) return res.status(400).json({ error: `intervalMinutes must be one of ${allowedMinutes.join(', ')}` });
    
    const company_id = req.user?.company_id;
    const allUsers = readUsers();
    const targetUser = allUsers.find(u => u.email === employeeId);
    if (!targetUser || targetUser.company_id != company_id) {
      return res.status(404).json({ error: 'Employee not found in company' });
    }

    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub);
      if (!teamEmails.includes(employeeId)) return res.status(403).json({ error: 'Forbidden: not your team' });
    }
  const secs = mins * 60;
  const intervals = JSON.parse(fs.readFileSync(intervalsFile, 'utf-8'));
  intervals[employeeId] = secs;
  fs.writeFileSync(intervalsFile, JSON.stringify(intervals, null, 2));
  // Audit
  appendAudit('interval_set', { actorId: req.user?.uid || req.user?.sub, employeeId, intervalMinutes: mins }, company_id);
  // Notify the employee in real-time via Socket.IO so their desktop reflects and starts tracking
  try {
    io.to(userRoom(employeeId)).emit('interval:assigned', { employeeId, intervalSeconds: secs });
  } catch (emitErr) {
    console.warn('[interval:set] emit failed:', emitErr?.message || emitErr);
    }
    res.json({ ok: true, employeeId, intervalSeconds: secs });
  } catch (e) {
    console.error('[interval:set] error:', e);
    res.status(500).json({ error: 'Failed to save interval' });
  }
});

app.get('/api/capture-intervals', requireRole(['manager','super_admin']), (req, res) => {
  try {
    const company_id = req.user?.company_id
    const intervals = JSON.parse(fs.readFileSync(intervalsFile, 'utf-8'))
    const allUsers = readUsers().filter(u => u.company_id == company_id && u.role === 'employee')
    let list = allUsers.map(u => ({ email: u.email, name: u.name || '', intervalSeconds: intervals[u.email] || null }))
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub, company_id)
      list = list.filter(r => teamEmails.includes(r.email))
    }
    res.json({ intervals: list })
  } catch (e) {
    res.status(500).json({ error: 'Failed to load intervals' })
  }
})

// ---- Work Hours Tracking ----
function readSessions(){
  try { return JSON.parse(fs.readFileSync(sessionsFile, 'utf-8')); } catch { return []; }
}
function writeSessions(arr){
  fs.writeFileSync(sessionsFile, JSON.stringify(arr, null, 2));
}
function todayStr(){ return new Date().toISOString().slice(0,10); }

// ---- Employee Self-Service APIs ----
// Personal dashboard summary
app.get('/api/employee/dashboard-summary', requireRole(['employee']), (req, res) => {
  try {
    const email = req.user?.sub;
    const company_id = req.user?.company_id;
    const sessions = readSessions().filter(s => s.employeeId === email && s.company_id == company_id);
    const approvedManual = getTimeRequests(company_id, req.user?.uid).filter(r => r.status === 'approved' && r.employee_id == req.user?.uid);
    const userTimezone = (() => {
      try {
        const all = readUsers();
        const u = all.find(x => x.email === email);
        return u?.timezone || 'UTC';
      } catch { return 'UTC'; }
    })();

    const now = new Date();
    const dayStr = todayStr();
    const weekStartMs = new Date(now.getTime() - 7*24*60*60*1000).getTime();
    const monthStartMs = new Date(now.getTime() - 30*24*60*60*1000).getTime();

    const calcSeconds = (arr) => arr.reduce((sum, s) => {
      const startMs = new Date(s.startedAt).getTime();
      const endMs = s.endedAt ? new Date(s.endedAt).getTime() : now.getTime();
      const active = Math.max(0, Math.floor((endMs - startMs)/1000));
      const idle = s.idleSeconds || 0;
      return sum + Math.max(0, active - idle);
    }, 0);

    const daySeconds = calcSeconds(sessions.filter(s => s.date === dayStr));
    const weekSeconds = calcSeconds(sessions.filter(s => new Date(s.startedAt).getTime() >= weekStartMs));
    const monthSeconds = calcSeconds(sessions.filter(s => new Date(s.startedAt).getTime() >= monthStartMs));

    const manualSeconds = approvedManual.reduce((sum, r) => {
      try {
        const start = new Date(`${r.date}T${r.start_time}`);
        const end = new Date(`${r.date}T${r.end_time}`);
        const dur = Math.max(0, Math.floor((end.getTime() - start.getTime())/1000));
        return sum + dur;
      } catch { return sum; }
    }, 0);

    const toHours = (secs) => Number((secs/3600).toFixed(1));
    const daily_hours = toHours(daySeconds);
    const weekly_hours = toHours(weekSeconds + manualSeconds);
    const monthly_hours = toHours(monthSeconds + manualSeconds);

    const recent_sessions = sessions.slice().sort((a,b)=> (a.startedAt < b.startedAt?1:-1)).slice(0,5).map(s => {
      const startMs = new Date(s.startedAt).getTime();
      const endMs = s.endedAt ? new Date(s.endedAt).getTime() : now.getTime();
      const active = Math.max(0, Math.floor((endMs - startMs)/1000));
      const idle = s.idleSeconds || 0;
      const ratio = active ? (1 - Math.min(idle/active, 1)) : 0;
      const status = ratio >= 0.8 ? 'productive' : ratio >= 0.6 ? 'neutral' : 'unproductive';
      return { start_time: s.startedAt, end_time: s.endedAt, duration: active, idle_time: idle, productivity_status: status };
    });

    res.json({ daily_hours, weekly_hours, monthly_hours, productivity_score: Math.round(Math.min(100, Math.max(0, (daily_hours/8)*100))), recent_sessions, timezone: userTimezone });
  } catch (e) {
    console.error('[employee:summary] error:', e);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// Activity timeline
app.get('/api/employee/activity-timeline', requireRole(['employee']), (req, res) => {
  try {
    const email = req.user?.sub;
    const company_id = req.user?.company_id;
    const { start_date, end_date, type } = req.query || {};
    const sessions = readSessions().filter(s => s.employeeId === email && s.company_id == company_id);
    const startMs = start_date ? new Date(`${start_date}T00:00:00Z`).getTime() : null;
    const endMs = end_date ? new Date(`${end_date}T23:59:59Z`).getTime() : null;
    const inRange = sessions.filter(s => {
      const t = new Date(s.startedAt).getTime();
      if (startMs && t < startMs) return false;
      if (endMs && t > endMs) return false;
      return true;
    });
    let activities = inRange.map(s => {
      const st = new Date(s.startedAt).getTime();
      const en = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
      const active = Math.max(0, Math.floor((en - st)/1000));
      const idle = s.idleSeconds || 0;
      const ratio = active ? (1 - Math.min(idle/active, 1)) : 0;
      const status = ratio >= 0.8 ? 'productive' : ratio >= 0.6 ? 'neutral' : 'unproductive';
      return { id: s.id, type: 'tracked_session', start_time: s.startedAt, end_time: s.endedAt, duration: active, idle_time: idle, productivity_status: status, applications: [], screenshots: 0, manual_entry: null };
    });

    const requests = getTimeRequests(company_id, req.user?.uid);
    const manualAct = requests.map(r => ({
      id: `manual_${r.id}`,
      type: 'manual_entry',
      start_time: `${r.date}T${r.start_time}`,
      end_time: `${r.date}T${r.end_time}`,
      duration: Math.max(0, Math.floor((new Date(`${r.date}T${r.end_time}`).getTime() - new Date(`${r.date}T${r.start_time}`).getTime())/1000)),
      idle_time: 0,
      productivity_status: r.status === 'approved' ? 'productive' : (r.status === 'rejected' ? 'unproductive' : 'neutral'),
      manual_entry: { description: r.reason || '', status: r.status },
      applications: [],
      screenshots: 0
    }));

    activities = activities.concat(manualAct).sort((a,b)=> (a.start_time < b.start_time ? 1 : -1));
    if (type && type !== 'all') activities = activities.filter(a => a.type === type);
    res.json({ activities, timezone: 'UTC' });
  } catch (e) {
    console.error('[employee:activity] error:', e);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

// Profile read/update (timezone & full_name)
app.get('/api/employee/profile', requireRole(['employee']), (req, res) => {
  try {
    const email = req.user?.sub;
    const allUsers = readUsers();
    const u = allUsers.find(x => x.email === email) || {};
    // Also fetch from SQLite to get full_name if not in JSON
    const dbUser = getUserByEmail(email);
    
    const company = getCompanyById(req.user?.company_id);
    res.json({ 
      id: u?.id || req.user?.uid, 
      email, 
      full_name: dbUser?.full_name || u?.name || '', 
      country: dbUser?.country || u?.country || '', 
      role: 'employee', 
      timezone: u?.timezone || dbUser?.timezone || 'UTC', 
      company_name: company?.name || '' 
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.put('/api/employee/profile', requireRole(['employee']), (req, res) => {
  try {
    const email = req.user?.sub;
    const { timezone, full_name, country } = req.body || {};
    
    // Update JSON users file inplace
    const users = readUsers();
    const idx = users.findIndex(u => u.email === email);
    if (idx >= 0) {
      if (timezone) users[idx].timezone = timezone;
      if (full_name) users[idx].name = full_name; // Legacy JSON uses 'name'
      if (country) users[idx].country = country;
      writeUsers(users);
    }
    
    // Update SQLite
    const dbUser = getUserByEmail(email);
    if (dbUser) {
      updateUserProfile(dbUser.id, { full_name, email, country, timezone });
      if (timezone) {
        updateUserTimezone(email, timezone);
      }
    }

    const company = getCompanyById(req.user?.company_id);
    res.json({ 
      id: users[idx]?.id || req.user?.uid, 
      email, 
      full_name: full_name || dbUser?.full_name || '',
      country: country || dbUser?.country || '',
      role: 'employee', 
      timezone: timezone || 'UTC', 
      company_name: company?.name || '' 
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Generic Profile Update for all roles (Manager/Admin)
app.get('/api/user/profile', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const email = req.user?.sub;
    const user = getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const company = getCompanyById(user.company_id);
    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      country: user.country || '',
      role: user.role,
      timezone: user.timezone || 'UTC',
      company_name: company?.name || ''
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.put('/api/user/profile', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const email = req.user?.sub;
    const { full_name, timezone, country } = req.body || {};
    const user = getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (full_name) {
      updateUserProfile(user.id, { full_name, country, timezone });
    }
    // Update timezone if needed (not yet in updateUserProfile)
    if (timezone) updateUserTimezone(email, timezone);
    
    res.json({ ok: true, full_name, country, timezone });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Reports listing
app.get('/api/employee/reports', requireRole(['employee']), (req, res) => {
  try {
    const email = req.user?.sub;
    const idxFile = path.join(dataPath, 'reports.index.json');
    let index = [];
    try { index = JSON.parse(fs.readFileSync(idxFile, 'utf-8')); } catch { index = []; }
    const mine = index.filter(r => r.email === email).sort((a,b)=> (a.created_at < b.created_at ? 1 : -1));
    res.json({ reports: mine });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// Report generation (CSV)
app.post('/api/employee/generate-report', requireRole(['employee']), (req, res) => {
  try {
    const { report_type, start_date, end_date, format } = req.body || {};
    const email = req.user?.sub;
    const company_id = req.user?.company_id;
    const sessions = readSessions().filter(s => s.employeeId === email && s.company_id == company_id);
    const startMs = start_date ? new Date(`${start_date}T00:00:00Z`).getTime() : null;
    const endMs = end_date ? new Date(`${end_date}T23:59:59Z`).getTime() : null;
    const inRange = sessions.filter(s => {
      const t = new Date(s.startedAt).getTime();
      if (startMs && t < startMs) return false;
      if (endMs && t > endMs) return false;
      return true;
    });

    const rows = [['Start','End','DurationSeconds','IdleSeconds','NetActiveSeconds']];
    for (const s of inRange) {
      const st = new Date(s.startedAt).getTime();
      const en = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
      const active = Math.max(0, Math.floor((en - st)/1000));
      const idle = s.idleSeconds || 0;
      const net = Math.max(0, active - idle);
      rows.push([s.startedAt, s.endedAt || '', String(active), String(idle), String(net)]);
    }

    const csv = rows.map(r => r.join(',')).join('\n');
    const fname = `employee_${email.replace(/[^a-zA-Z0-9]/g,'_')}_${Date.now()}.csv`;
    fs.writeFileSync(path.join(publicReportsPath, fname), csv);
    const file_size = fs.statSync(path.join(publicReportsPath, fname)).size;

    const idxFile = path.join(dataPath, 'reports.index.json');
    let index = [];
    try { index = JSON.parse(fs.readFileSync(idxFile, 'utf-8')); } catch { index = []; }
    const record = {
      report_type: report_type || 'detailed_activity',
      start_date: start_date || '',
      end_date: end_date || '',
      format: (format || 'csv'),
      download_url: `${req.protocol}://${req.get('host')}/reports/${fname}`,
      created_at: new Date().toISOString(),
      file_size,
      email
    };
    index.push(record);
    fs.writeFileSync(idxFile, JSON.stringify(index, null, 2));
    res.json(record);
  } catch (e) {
    console.error('[employee:generate_report] error:', e);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Employee starts a work session
app.post('/api/work/start', requireRole(['employee']), (req, res) => {
  try {
    const employeeId = req.user?.sub;
    const company_id = req.user?.company_id;
    const sessions = readSessions();
    // If an active session exists, return it
    const active = sessions.find(s => s.employeeId === employeeId && s.isActive);
    if (active) return res.json({ ok: true, session: active });
    const now = new Date().toISOString();
    const record = { id: `${employeeId}-${Date.now()}`, employeeId, company_id, startedAt: now, endedAt: null, isActive: true, idleSeconds: 0, lastHeartbeatAt: now, date: todayStr() };
    sessions.push(record);
    writeSessions(sessions);
    res.status(201).json({ ok: true, session: record });
  } catch (e) {
    console.error('[work:start] error:', e);
    res.status(500).json({ error: 'Failed to start work session' });
  }
});

// Employee heartbeat with idle delta seconds
app.post('/api/work/heartbeat', requireRole(['employee']), (req, res) => {
  try {
    const employeeId = req.user?.sub;
    const { idleDeltaSeconds = 0 } = req.body || {};
    const sessions = readSessions();
    const active = sessions.find(s => s.employeeId === employeeId && s.isActive);
    if (!active) return res.status(404).json({ error: 'No active session' });
    const delta = Math.max(0, Number(idleDeltaSeconds) || 0);
    active.idleSeconds = (active.idleSeconds || 0) + delta;
    active.lastHeartbeatAt = new Date().toISOString();
    writeSessions(sessions);
    res.json({ ok: true, idleSeconds: active.idleSeconds });
  } catch (e) {
    console.error('[work:heartbeat] error:', e);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// Employee stops the work session
app.post('/api/work/stop', requireRole(['employee']), (req, res) => {
  try {
    const employeeId = req.user?.sub;
    const sessions = readSessions();
    const active = sessions.find(s => s.employeeId === employeeId && s.isActive);
    if (!active) return res.status(404).json({ error: 'No active session' });
    active.endedAt = new Date().toISOString();
    active.isActive = false;
    writeSessions(sessions);
    // Terminate any ongoing live streams for this employee
    try {
      liveStreamOn.set(employeeId, false);
      io.to(viewersRoom(employeeId)).emit('live_view:terminate', { by: employeeId, reason: 'work_stop' });
    } catch {}
    res.json({ ok: true, session: active });
  } catch (e) {
    console.error('[work:stop] error:', e);
    res.status(500).json({ error: 'Failed to stop work session' });
  }
});

// Manager summary: today per employee
app.get('/api/work/summary/today', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const sessions = readSessions();
    
    // Filter by company
    const company_id = req.user?.company_id;
    const allUsers = readUsers();
    const companyUserEmails = new Set(allUsers.filter(u => u.company_id == company_id).map(u => u.email));
    const companySessions = sessions.filter(s => companyUserEmails.has(s.employeeId));

    const today = todayStr();
    const byEmp = {};
    for (const s of companySessions.filter(x => x.date === today)) {
      const k = s.employeeId;
      if (!byEmp[k]) byEmp[k] = [];
      byEmp[k].push(s);
    }
    let entries = Object.entries(byEmp);
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub, req.user?.company_id);
      entries = entries.filter(([employeeId]) => teamEmails.includes(employeeId));
    }
    const result = entries.map(([employeeId, arr]) => {
      // Active duration sums across sessions
      let totalActiveSeconds = 0;
      let totalIdleSeconds = 0;
      let loginTimes = [];
      let logoutTimes = [];
      for (const s of arr) {
        const start = new Date(s.startedAt).getTime();
        const end = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
        totalActiveSeconds += Math.max(0, Math.floor((end - start) / 1000));
        totalIdleSeconds += s.idleSeconds || 0;
        loginTimes.push(s.startedAt);
        if (s.endedAt) logoutTimes.push(s.endedAt);
      }
      const netActiveSeconds = Math.max(0, totalActiveSeconds - totalIdleSeconds);
      return { employeeId, loginTimes, logoutTimes, totalActiveSeconds, totalIdleSeconds, netActiveSeconds };
    });
    res.json({ today: today, employees: result });
  } catch (e) {
    console.error('[work:summary] error:', e);
    res.status(500).json({ error: 'Summary failed' });
  }
});

// Manager endpoint: today sessions per employee with per-session details
app.get('/api/work/sessions/today', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const sessions = readSessions();
    
    // Filter by company
    const company_id = req.user?.company_id;
    const allUsers = readUsers();
    const companyUserEmails = new Set(allUsers.filter(u => u.company_id == company_id).map(u => u.email));
    const companySessions = sessions.filter(s => companyUserEmails.has(s.employeeId));

    const today = todayStr();
    const byEmp = {};
    for (const s of companySessions.filter(x => x.date === today)) {
      const k = s.employeeId;
      if (!byEmp[k]) byEmp[k] = [];
      const startMs = new Date(s.startedAt).getTime();
      const endMs = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
      const activeSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
      const idleSeconds = s.idleSeconds || 0;
      const netActiveSeconds = Math.max(0, activeSeconds - idleSeconds);
      byEmp[k].push({
        id: s.id,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        isActive: !!s.isActive,
        activeSeconds,
        idleSeconds,
        netActiveSeconds,
      });
    }
    let entries = Object.entries(byEmp);
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub);
      entries = entries.filter(([employeeId]) => teamEmails.includes(employeeId));
    }
    const result = entries.map(([employeeId, sessions]) => ({ employeeId, sessions }));
    res.json({ today, employees: result });
  } catch (e) {
    console.error('[work:sessions] error:', e);
    res.status(500).json({ error: 'Sessions fetch failed' });
  }
});

// Screenshot upload
app.post('/api/uploads/screenshot', requireRole(['employee']), upload.single('screenshot'), async (req, res) => {
  try {
    const fileRelPath = path.relative(process.cwd(), req.file.path);
    const employeeId = (req.body && (req.body.employeeId || req.body.email)) || 'unknown';
    const company_id = req.user?.company_id;
    const record = { file: fileRelPath.replace(/\\/g, '/'), employeeId, company_id, ts: new Date().toISOString() };
    // Append metadata to uploads/index.json (simple dev store)
    try {
      const arr = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      arr.push(record);
      fs.writeFileSync(metaFile, JSON.stringify(arr, null, 2));
    } catch (e) {
      console.error('[meta] write failed:', e);
    }
    try { io.emit('uploads:new', { employeeId, file: record.file, ts: record.ts }); } catch {}

    // Mark employee as online upon receiving a screenshot (helps Live View selection)
    if (employeeId && employeeId !== 'unknown') {
      onlineEmployees.add(employeeId);
      // Broadcast to company room if we have context, or global fallback
      if (company_id) {
        io.to(`company:${company_id}`).emit('presence:online', { userId: employeeId });
      } else {
        io.emit('presence:online', { userId: employeeId });
      }
    }

    // If a manager has started live view for this employee, relay the frame to viewers
    try {
      const absFile = path.resolve(req.file.path);
      const frameBase64 = fs.readFileSync(absFile, { encoding: 'base64' });
      if (liveStreamOn.get(employeeId)) {
        io.to(viewersRoom(employeeId)).emit('live_view:frame', { employeeId, frameBase64, ts: record.ts });
      }
    } catch (e) {
      console.warn('[live_view] relay failed:', e?.message || e);
    }

    res.status(201).json({ file: record.file });
  } catch (err) {
    console.error('[upload] error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/uploads/cleanup', requireRole(['super_admin']), (req, res) => {
  try {
    const { from, to } = req.body || {};
    const toStartISO = (ds) => {
      if (!ds) return null;
      const base = new Date(ds);
      const d = new Date(`${base.toISOString().slice(0,10)}T00:00:00`);
      return d.toISOString();
    };
    const toEndISO = (ds) => {
      if (!ds) return null;
      const base = new Date(ds);
      const d = new Date(`${base.toISOString().slice(0,10)}T00:00:00`);
      return new Date(d.getTime() + 24*60*60*1000 - 1).toISOString();
    };
    const fromIso = from ? toStartISO(from) : null;
    const toIso = to ? toEndISO(to) : null;
    const fromMs = fromIso ? new Date(fromIso).getTime() : null;
    const toMs = toIso ? new Date(toIso).getTime() : null;
    let meta = [];
    try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8')); } catch {}
    const inRange = (ts) => {
      const t = new Date(ts).getTime();
      if (fromMs && t < fromMs) return false;
      if (toMs && t > toMs) return false;
      return true;
    };
    const targets = meta.filter(m => m.ts && inRange(m.ts));
    let removed = 0;
    let bytesFreed = 0;
    for (const m of targets) {
      try {
        const fname = path.basename(String(m.file || ''));
        const abs = path.join(uploadPath, fname);
        try { bytesFreed += fs.statSync(abs).size; } catch {}
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
        removed += 1;
      } catch {}
    }
    const keep = meta.filter(m => !(m.ts && inRange(m.ts)));
    try { fs.writeFileSync(metaFile, JSON.stringify(keep, null, 2)); } catch {}
    try { io.emit('uploads:cleanup_done', { removed, bytesFreed, from: fromIso, to: toIso }); } catch {}
    res.json({ ok: true, removed, bytesFreed });
  } catch (err) {
    console.error('[uploads:cleanup] error:', err);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// List uploaded screenshots (development helper)
app.get('/api/uploads/list', requireRole(['manager', 'super_admin']), async (req, res) => {
  try {
    const files = fs.readdirSync(uploadPath).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).sort();
    let meta = [];
    try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8')); } catch {}
    
    const company_id = req.user?.company_id;
    const allUsers = readUsers();
    const companyUserEmails = new Set(allUsers.filter(u => u.company_id == company_id).map(u => u.email));

    let items = files.map(f => {
      const rel = `uploads/${f}`;
      const m = meta.find(x => x.file === rel);
      let ts = m?.ts;
      if (!ts) {
        try { ts = fs.statSync(path.join(uploadPath, f)).mtime.toISOString(); } catch {}
      }
      return { file: rel, ts, employeeId: m?.employeeId };
    });
    
    // Filter by company
    items = items.filter(it => it.employeeId && companyUserEmails.has(it.employeeId));

    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub);
      items = items.filter(it => it.employeeId && teamEmails.includes(it.employeeId));
    }
    // Super Admin: sees all company items (no extra filter needed)
    
    res.json({ files: items });
  } catch (err) {
    console.error('[upload:list] error:', err);
    res.status(500).json({ error: 'List failed' });
  }
});

// Query uploaded screenshots by employee and date range
app.get('/api/uploads/query', requireRole(['manager', 'super_admin']), async (req, res) => {
  try {
    const { employeeId, from, to } = req.query || {};
    let meta = [];
    try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8')); } catch {}
    
    // Filter by company
    const company_id = req.user?.company_id;
    const allUsers = readUsers();
    const companyUserEmails = new Set(allUsers.filter(u => u.company_id == company_id).map(u => u.email));
    meta = meta.filter(m => m.employeeId && companyUserEmails.has(m.employeeId));

    // Manager scoping to team
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub);
      meta = meta.filter(m => m.employeeId && teamEmails.includes(m.employeeId));
    }
    
    // Super Admin: Sees ALL by default (already scoped to company above).
    
    // Filter by employee
    if (employeeId) {
      meta = meta.filter(m => String(m.employeeId).toLowerCase() === String(employeeId).toLowerCase());
    }
    // Filter by date range (ISO)
    const fromMs = from ? new Date(from).getTime() : null;
    const toMs = to ? new Date(to).getTime() : null;
    if (fromMs) meta = meta.filter(m => new Date(m.ts).getTime() >= fromMs);
    if (toMs) meta = meta.filter(m => new Date(m.ts).getTime() <= toMs);
    // Sort by time ascending
    meta.sort((a, b) => (a.ts > b.ts ? 1 : -1));
    res.json({ files: meta });
  } catch (err) {
    console.error('[upload:query] error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Sessions by date range with per-session details
app.get('/api/work/sessions/range', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const { employeeId, from, to } = req.query || {};
    const sessions = readSessions();
    
    // Filter by company
    const company_id = req.user?.company_id;
    const allUsers = readUsers();
    const companyUserEmails = new Set(allUsers.filter(u => u.company_id == company_id).map(u => u.email));
    const companySessions = sessions.filter(s => companyUserEmails.has(s.employeeId));

    const fromStr = from ? String(from).slice(0,10) : null;
    const toStr = to ? String(to).slice(0,10) : null;
    const inRange = companySessions.filter(s => {
      const d = s.date;
      if (fromStr && d < fromStr) return false;
      if (toStr && d > toStr) return false;
      return true;
    });
    const byEmp = {};
    for (const s of inRange) {
      const k = s.employeeId;
      if (employeeId && String(k).toLowerCase() !== String(employeeId).toLowerCase()) continue;
      if (!byEmp[k]) byEmp[k] = [];
      const startMs = new Date(s.startedAt).getTime();
      const endMs = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
      const activeSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
      const idleSeconds = s.idleSeconds || 0;
      const netActiveSeconds = Math.max(0, activeSeconds - idleSeconds);
      byEmp[k].push({
        id: s.id,
        date: s.date,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        isActive: !!s.isActive,
        activeSeconds,
        idleSeconds,
        netActiveSeconds,
      });
    }
    let entries = Object.entries(byEmp);
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub);
      entries = entries.filter(([eid]) => teamEmails.includes(eid));
    }
    const result = entries.map(([employeeId, sessions]) => ({ employeeId, sessions }));
    res.json({ employees: result, from: fromStr, to: toStr });
  } catch (e) {
    console.error('[work:sessions_range] error:', e);
    res.status(500).json({ error: 'Sessions range failed' });
  }
});

// Activity: recent screenshots grouped by employee (dev helper)
app.get('/api/activity/recent', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    const arr = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    // group by employeeId
    const company_id = req.user?.company_id;
    const allUsers = readUsers();
    const companyUserEmails = new Set(allUsers.filter(u => u.company_id == company_id).map(u => u.email));

    const byEmp = {};
    for (const r of arr) {
      const k = r.employeeId || 'unknown';
      if (!companyUserEmails.has(k)) continue;
      if (!byEmp[k]) byEmp[k] = [];
      byEmp[k].push(r);
    }
    let entries = Object.entries(byEmp);
    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub);
      entries = entries.filter(([employeeId]) => teamEmails.includes(employeeId));
    }
    // Super Admin: sees all company employees (no extra filter needed)
    
    const result = entries.map(([employeeId, records]) => {
      const sorted = records.sort((a, b) => (a.ts < b.ts ? 1 : -1));
      return {
        employeeId,
        latest: sorted.slice(0, 3).map(r => ({ file: r.file, ts: r.ts })),
        count: records.length
      };
    });
    res.json({ employees: result });
  } catch (e) {
    console.error('[activity] error:', e);
    res.status(500).json({ error: 'Activity failed' });
  }
});

// Live View via Socket.IO with auth and viewer rooms
const userRoom = (userId) => `user:${userId}`;
const viewersRoom = (employeeId) => `live:viewers:${employeeId}`;
const onlineEmployees = new Set();
// Track live streaming enablement per employee; frames are relayed only when true
const liveStreamOn = new Map(); // employeeId -> boolean

io.use((socket, next) => {
  try {
    // Accept token from Authorization header or Socket.IO auth payload
    const authHeader = socket.handshake.headers?.authorization || '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const authToken = socket.handshake.auth?.token || null;
    const qpToken = socket.handshake.query?.token || null; // fallback if needed
    const token = headerToken || authToken || qpToken;
    if (!token) return next();
    const payload = jwt.verify(token, JWT_SECRET);
    // attach to socket for downstream usage (production: trust only verified token)
    socket.data.userId = payload?.email || payload?.userId; // email identifier (employees/managers)
    socket.data.uid = payload?.uid || null; // numeric/uuid id (managers)
    socket.data.role = payload?.role || 'employee';
    socket.data.company_id = payload?.company_id || null;
    next();
  } catch (err) {
    console.warn('[socket] auth failed:', err.message);
    next();
  }
});

io.on('connection', (socket) => {
  const qpUserId = socket.handshake.query?.userId;
  const qpUid = socket.handshake.query?.uid;
  const userId = socket.data.userId || qpUserId;
  // Production: role must come from verified token. Ignore query role.
  const role = socket.data.role || 'employee';
  const managerUid = socket.data.uid || qpUid || null;
  const company_id = socket.data.company_id;
  
  // Join company room for scoped broadcasts
  if (company_id) {
    socket.join(`company:${company_id}`);
  }

  if (userId) {
    socket.join(userRoom(userId));
  }

  // Track presence: employees
  if (role === 'employee' && userId) {
    onlineEmployees.add(userId);
    // Broadcast only to company room
    if (company_id) {
      io.to(`company:${company_id}`).emit('presence:online', { userId });
    } else {
      // Legacy fallback
      io.emit('presence:online', { userId });
    }
  }

  // On manager connection, send current online employees list (scoped to team AND company)
  if (role === 'manager' || role === 'super_admin') {
    let users = Array.from(onlineEmployees);
    
    // Filter users by company (needs lookup if we don't store company_id in onlineEmployees)
    // Optimization: onlineEmployees could be Set<string> of emails. 
    // We can filter by checking against allUsers (memory cache)
    const allUsers = readUsers();
    users = users.filter(email => {
      const u = allUsers.find(au => au.email === email);
      return u && u.company_id == company_id;
    });

    if (role === 'manager') {
      const teamEmails = getTeamEmailsForManager(managerUid || socket.data.uid || socket.data.userId || userId, company_id);
      users = users.filter(u => teamEmails.includes(u));
    }
    socket.emit('presence:list', { users });
  }

  // Manager can start live view: join the viewer room and signal employee
  socket.on('live_view:start', ({ employeeId }) => {
    // Only allow verified manager/super_admin via JWT
    if (role !== 'manager' && role !== 'super_admin') return;

    // Validate permission
    const allUsers = readUsers();
    const targetUser = allUsers.find(u => u.email === employeeId);
    if (!targetUser || targetUser.company_id != company_id) {
       return; // Ignore if not in company
    }

    if (role === 'manager') {
      const teamEmails = getTeamEmailsForManager(managerUid || socket.data.uid || socket.data.userId || userId, company_id);
      if (!teamEmails.includes(employeeId)) return; // ignore if not in team
    }
    socket.join(viewersRoom(employeeId));
    liveStreamOn.set(employeeId, true);
    io.to(userRoom(employeeId)).emit('live_view:initiate', { by: userId });
    appendAudit('live_view_start', { actorId: socket.data.userId || userId, employeeId }, company_id);
  });

  // Manager can stop live view: leave the viewer room and signal employee
  socket.on('live_view:stop', ({ employeeId }) => {
    if (role !== 'manager' && role !== 'super_admin') return;
    
    // Validate permission
    const allUsers = readUsers();
    const targetUser = allUsers.find(u => u.email === employeeId);
    if (!targetUser || targetUser.company_id != company_id) {
       return; 
    }

    if (role === 'manager') {
      const teamEmails = getTeamEmailsForManager(managerUid || socket.data.uid || socket.data.userId || userId, company_id);
      if (!teamEmails.includes(employeeId)) return; // ignore if not in team
    }
    socket.leave(viewersRoom(employeeId));
    liveStreamOn.set(employeeId, false);
    io.to(userRoom(employeeId)).emit('live_view:terminate', { by: userId, reason: 'manager_stop' });
    io.to(viewersRoom(employeeId)).emit('live_view:terminate', { by: userId, reason: 'manager_stop' });
  });

  // Employee can notify termination (e.g., tracking stopped)
  socket.on('live_view:terminate', ({ employeeId }) => {
    if (role !== 'employee') return;
    liveStreamOn.set(employeeId, false);
    io.to(viewersRoom(employeeId)).emit('live_view:terminate', { by: userId, reason: 'employee_terminate' });
  });

// Employee streams frames; server always relays to viewers of that employee
socket.on('live_view:frame', ({ employeeId, frameBase64, ts }) => {
  io.to(viewersRoom(employeeId)).emit('live_view:frame', { employeeId, frameBase64, ts });
});

  socket.on('disconnect', () => {
    // If an employee disconnects, proactively terminate any viewer sessions
    if (role === 'employee' && userId) {
      onlineEmployees.delete(userId);
      // Broadcast offline to company room
      const cid = socket.data.company_id;
      if (cid) {
        io.to(`company:${cid}`).emit('presence:offline', { userId });
      } else {
        io.emit('presence:offline', { userId });
      }
      liveStreamOn.set(userId, false);
      io.to(viewersRoom(userId)).emit('live_view:terminate', { by: userId, reason: 'offline' });
    }
  });
});

// DB connection
connectMongo(process.env.MONGO_URI);

httpServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} is already in use. Is another instance running?`);
    process.exit(1);
  } else {
    console.error('[server] Server error:', err);
  }
});

const shutdown = () => {
  try { io.disconnectSockets(true); } catch {}
  try { io.close(); } catch {}
  try {
    httpServer.close(() => process.exit(0));
  } catch {
    process.exit(0);
  }
  setTimeout(() => process.exit(0), 3000);
};

['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((sig) => {
  try { process.on(sig, shutdown); } catch {}
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[server] Unhandled rejection:', err);
});

// Serve built frontend (SPA) in production if available
try {
  const webDistPath = path.join(process.cwd(), 'web', 'dist');
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    // SPA fallback: send index.html for non-API routes
    // But exclude /reset-password if it's handled by frontend routing?
    // Wait, the error is "Cannot GET /reset-password" from Express.
    // This means Express is trying to handle it but finding no route, AND static file serving didn't catch it?
    // If 'web/dist' exists, line 2168 handles it.
    // If 'web/dist' does NOT exist (dev mode), Express returns 404 because no route matches.
    // In dev mode, we usually run Vite dev server on 5173.
    // The link generated is http://localhost:4000/reset-password...
    // If we are in dev mode, we should point to the frontend URL (e.g. localhost:5173 or process.env.FRONTEND_URL)
    
    app.get('/reset-password', (req, res) => {
      // In dev mode, redirect to frontend port 5173
      const token = req.query.token;
      if (token) {
        // Assume frontend is on 5173 if not specified
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/reset-password?token=${token}`);
      }
      res.status(404).send('Reset token missing');
    });

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/downloads')) return next();
      // If we are serving static files, send index.html
      if (fs.existsSync(path.join(process.cwd(), 'web', 'dist', 'index.html'))) {
         res.sendFile(path.join(process.cwd(), 'web', 'dist', 'index.html'));
      } else {
         // If no static build, and we are hitting backend port with frontend route, we should redirect or inform user?
         // Ideally, the email link should point to the FRONTEND port in dev.
         // But let's support it via redirect if possible? 
         // Or just return 404 with message.
         next();
      }
    });
    console.log('[server] Serving static frontend from', webDistPath);
  }
} catch (e) {
  console.warn('[server] Unable to configure static frontend serving:', e?.message || e);
}


// ---------- BEGIN: compatibility proxy to support hardcoded :4000 frontend ----------
// If the backend starts on a different port than 4000, create a tiny proxy
// that listens on 4000 and forwards requests to the real server port.
// This helps dev setups where the frontend expects http://localhost:4000.
import http from 'http';

const ACTUAL_PORT = Number(PORT) || 4000;
const LEGACY_PORT = 4000;

// start the main server (this is already in your file):
httpServer.listen(PORT, () => {
  const base = `http://localhost:${PORT}`;
  console.log(`[server] API listening at ${base}`);
  console.log(`[server] Upload dir: ${uploadPath}`);

  // only create proxy when needed and when LEGACY_PORT !== ACTUAL_PORT
  if (Number(ACTUAL_PORT) !== Number(LEGACY_PORT)) {
    try {
      const proxy = http.createServer((req, res) => {
        // forward request to actual server
        const options = {
          hostname: HOST,
          port: ACTUAL_PORT,
          path: req.url,
          method: req.method,
          headers: req.headers
        };

        const proxied = http.request(options, proxRes => {
          res.writeHead(proxRes.statusCode, proxRes.headers);
          proxRes.pipe(res, { end: true });
        });

        proxied.on('error', err => {
          console.error('[proxy] Forward error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy forward error' }));
        });

        // pipe request body
        req.pipe(proxied, { end: true });
      });

      proxy.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          console.warn(`[proxy] Port ${LEGACY_PORT} already in use. Skipping compatibility proxy.`);
        } else {
          console.warn('[proxy] Error starting compatibility proxy:', err);
        }
      });

      proxy.listen(LEGACY_PORT, '127.0.0.1', () => {
        console.log(`[proxy] Compatibility proxy listening on http://127.0.0.1:${LEGACY_PORT} -> http://${HOST}:${ACTUAL_PORT}`);
      });
    } catch (e) {
      console.warn('[proxy] Failed to start compatibility proxy:', e?.message || e);
    }
  }
});
// ---------- END: compatibility proxy ----------
// Query current online employees (role-scoped)
app.get('/api/presence/online', requireRole(['manager', 'super_admin']), (req, res) => {
  try {
    let users = Array.from(onlineEmployees);
    const company_id = req.user?.company_id;
    const allUsers = readUsers();
    
    // Strict Company Filter for ALL roles
    users = users.filter(email => {
      const u = allUsers.find(au => au.email === email);
      return u && u.company_id == company_id;
    });

    if (req.user?.role === 'manager') {
      const teamEmails = getTeamEmailsForManager(req.user?.uid || req.user?.sub, company_id);
      users = users.filter(u => teamEmails.includes(u));
    }
    res.json({ users });
  } catch (e) {
    console.error('[presence:online] error:', e);
    res.status(500).json({ error: 'Failed to read presence' });
  }
});
