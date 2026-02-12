import dotenv from 'dotenv'
import Stripe from 'stripe'
dotenv.config()

let stripe = null

export function initStripe() {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  
  // Configure Stripe with proper timeouts for production
  stripe = new Stripe(key, {
    timeout: 30000, // 30 second timeout
    maxNetworkRetries: 3, // Retry failed requests 3 times
    apiVersion: '2023-10-16' // Use stable API version
  })
  
  // Log key type for debugging (test vs live)
  if (key.startsWith('sk_test_')) {
    console.log('[stripe] Using TEST key - this is for development/testing only')
  } else if (key.startsWith('sk_live_')) {
    console.log('[stripe] Using LIVE key - production mode')
  }
  
  return stripe
}

function normalizeReturnPath(return_path) {
  const raw = String(return_path || '').trim()
  if (!raw) return '/billing'
  if (raw.startsWith('http://') || raw.startsWith('https://')) return '/billing'
  if (!raw.startsWith('/')) return '/billing'
  return raw
}

function buildReturnUrl({ baseOrigin, return_path, status }) {
  const base = (baseOrigin || '').startsWith('http')
    ? baseOrigin
    : (process.env.SUCCESS_URL || process.env.CANCEL_URL || 'http://localhost:5173')

  const safePath = normalizeReturnPath(return_path)
  const idx = safePath.indexOf('?')
  const pathname = idx >= 0 ? safePath.slice(0, idx) : safePath
  const search = idx >= 0 ? safePath.slice(idx) : ''

  const u = new URL(base)
  u.pathname = pathname || '/billing'
  u.search = search || ''
  u.searchParams.set('status', status)
  return u.toString()
}

export async function createStripeCheckoutSession({ company_id, admin_user_id, credits, origin, return_path }) {
  const s = initStripe()
  const success = (() => {
    const u = new URL(buildReturnUrl({ baseOrigin: origin, return_path, status: 'success' }))
    u.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')
    return u.toString()
  })()
  const cancel = buildReturnUrl({ baseOrigin: origin, return_path, status: 'cancel' })
  const qty = Number(credits)
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('Invalid credits')
  const session = await s.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Company Credits' },
        unit_amount: qty * 100,
      },
      quantity: 1,
    }],
    success_url: success,
    cancel_url: cancel,
    metadata: {
      companyId: String(company_id || ''),
      adminUserId: String(admin_user_id || ''),
      credits: String(qty),
    }
  })
  return session.url
}

export function verifyStripeWebhookAndExtract(rawBody, signature) {
  const s = initStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET missing')
  if (!signature) throw new Error('stripe-signature missing')
  return s.webhooks.constructEvent(rawBody, signature, secret)
}
