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

export async function createStripeCheckoutSession({ company_id, admin_user_id, credit_amount_usd, origin }) {
  const s = initStripe()
  const success = (origin || '').startsWith('http') ? `${origin}/billing?status=success` : `${process.env.SUCCESS_URL || 'http://localhost:5173'}/billing?status=success`
  const cancel = (origin || '').startsWith('http') ? `${origin}/billing?status=cancel` : `${process.env.CANCEL_URL || 'http://localhost:5173'}/billing?status=cancel`
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
