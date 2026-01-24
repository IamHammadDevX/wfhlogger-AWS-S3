import nodemailer from 'nodemailer';

// Use environment variables for credentials
// In development, you can use Ethereal (https://ethereal.email) if no Gmail credentials provided
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'test@example.com',
    pass: process.env.EMAIL_PASS || 'testpassword'
  }
});

export async function sendEmail(to, subject, text, html) {
  if (!process.env.EMAIL_USER) {
    console.log('[Email] Mock send:', { to, subject, text });
    return true;
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Time Tracker" <noreply@timetracker.com>',
      to,
      subject,
      text,
      html: html || text
    });
    console.log('[Email] Sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Error:', error);
    return false;
  }
}

export function sendLowCreditWarning(to, balance) {
  const subject = 'Action Required: Low Credit Balance';
  const text = `Your Time Tracker account balance is low (${balance} credits). Please add credits to ensure uninterrupted service.`;
  return sendEmail(to, subject, text);
}

export function sendPaymentSuccess(to, amount, credits) {
  const subject = 'Payment Successful';
  const text = `We received your payment of $${amount}. ${credits} credits have been added to your account.`;
  return sendEmail(to, subject, text);
}

export function sendCreationBlocked(to) {
  const subject = 'Action Required: Employee Creation Blocked';
  const text = `You attempted to create a new employee, but your account has insufficient credits. Please add credits to proceed.`;
  return sendEmail(to, subject, text);
}

export function sendSubscriptionDeduction(to, deducted, remaining) {
  const subject = 'Monthly Subscription Deduction';
  const text = `We have deducted ${deducted} credits for your active employees. Remaining balance: ${remaining}.`;
  return sendEmail(to, subject, text);
}
