import dotenv from 'dotenv'
import Stripe from 'stripe'
dotenv.config()

let stripe = null

export function initStripe() {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  stripe = new Stripe(key)
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

export async function createStripeCheckoutSession({ company_id, admin_user_id, credit_amount_usd, origin, return_path }) {
  const s = initStripe()
  const success = buildReturnUrl({ baseOrigin: origin, return_path, status: 'success' })
  const cancel = buildReturnUrl({ baseOrigin: origin, return_path, status: 'cancel' })
  const session = await s.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Company Credits' },
        unit_amount: Math.round(Number(credit_amount_usd) * 100),
      },
      quantity: 1,
    }],
    success_url: success,
    cancel_url: cancel,
    metadata: {
      company_id: String(company_id || ''),
      admin_user_id: String(admin_user_id || ''),
      credit_amount_usd: String(credit_amount_usd || ''),
    }
  })
  return session.url
}

export function verifyStripeWebhookAndExtract(rawBody, signature) {
  try {
    const s = initStripe()
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET missing')
    return s.webhooks.constructEvent(rawBody, signature, secret)
  } catch (e) {
    console.error('[stripe:verify] failed:', e?.message || e)
    return null
  }
}
