import nodemailer from 'nodemailer';

// Use environment variables for credentials
// In development, you can use Ethereal (https://ethereal.email) if no Gmail credentials provided
const config = process.env.EMAIL_HOST ? {
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
} : {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

const transporter = nodemailer.createTransport(config);

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.warn('[Email] Connection warning:', error.message);
  } else {
    console.log('[Email] Server is ready to take our messages');
  }
});

export async function sendEmail(to, subject, text, html) {
  // If no credentials, log and return
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('example.com')) {
    console.log('[Email] Mock send (No credentials):', { to, subject });
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
    // Graceful fallback for Auth errors (Common in Dev)
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.warn('⚠️ [Email] Authentication Failed. Please check EMAIL_USER and EMAIL_PASS in .env');
      console.warn('   For Gmail, ensure you are using an App Password, not your login password.');
      console.log('   (Falling back to console log so the app flow continues)');
      console.log('   -------------------------------------------------------');
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Body: ${text}`);
      console.log('   -------------------------------------------------------');
      return true; // Return success to not block the calling function
    }
    
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

export function sendRequestStatus(to, status, date, reason) {
  const subject = `Time Adjustment Request ${status === 'approved' ? 'Approved' : 'Rejected'}`;
  const text = `Your request for manual time adjustment on ${date} has been ${status}.\n\nReason provided: ${reason}`;
  return sendEmail(to, subject, text);
}

export function sendNewUserCreated(to, { name, email, role, teamName, password, loginUrl }) {
  const subject = `New User Created: ${name} (${role})`;
  const text = `A new user has been created in the system.

User Details:
- Name: ${name}
- Email: ${email}
- Role: ${role}
- Team: ${teamName || 'Unassigned'}

Login Instructions:
- URL: ${loginUrl}
- Temporary Password: ${password}

Please log in and change your password immediately.`;

  const html = `
    <h2>New User Created</h2>
    <p>A new user has been created in the system.</p>
    <h3>User Details</h3>
    <ul>
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Role:</strong> ${role}</li>
      <li><strong>Team:</strong> ${teamName || 'Unassigned'}</li>
    </ul>
    <h3>Login Instructions</h3>
    <p><strong>URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
    <p><strong>Temporary Password:</strong> <code>${password}</code></p>
    <p><em>Please log in and change your password immediately.</em></p>
  `;
  return sendEmail(to, subject, text, html);
}

export function sendMonthlyBillingSummary(to, { period, activeEmployees, deducted, remaining }) {
  const subject = `Monthly Billing Summary - ${period}`;
  const text = `Here is your monthly billing summary for ${period}.

- Active Employees: ${activeEmployees}
- Credits Deducted: ${deducted}
- Remaining Balance: ${remaining}

Thank you for using Time Tracker.`;
  
  return sendEmail(to, subject, text);
}

export function sendContactFormEmail(to, { name, email, subject, message }) {
  const emailSubject = `Contact Form: ${subject}`;
  const text = `New message from Contact Form:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}`;

  const html = `
    <h2>New Contact Form Submission</h2>
    <ul>
      <li><strong>Name:</strong> ${name}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Subject:</strong> ${subject}</li>
    </ul>
    <h3>Message:</h3>
    <p>${message.replace(/\n/g, '<br>')}</p>
  `;

  return sendEmail(to, emailSubject, text, html);
}

export function sendPasswordResetEmail(to, resetUrl) {
  const subject = 'Password Reset Request';
  const text = `You requested a password reset for your Time Tracker account.
  
Please click the link below to reset your password:
${resetUrl}

If you did not request this, please ignore this email.
Link expires in 1 hour.`;

  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset for your Time Tracker account.</p>
    <p>Please click the button below to reset your password:</p>
    <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
    <p>If you did not request this, please ignore this email.</p>
    <p><small>Link expires in 1 hour.</small></p>
  `;
  
  return sendEmail(to, subject, text, html);
}
