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
  const html = `
    <h2 style="color: #d97706;">Low Balance Warning</h2>
    <p>Your Time Tracker account balance has dropped to <strong>${balance} credits</strong>.</p>
    <p>Please add credits immediately to ensure uninterrupted service for your employees.</p>
    <a href="${process.env.APP_URL || 'http://localhost:5173'}/billing" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;">Add Credits</a>
  `;
  return sendEmail(to, subject, text, html);
}

export function sendPaymentSuccess(to, amount, credits) {
  const subject = 'Payment Successful';
  const text = `We received your payment of $${amount}. ${credits} credits have been added to your account.`;
  const html = `
    <h2 style="color: #059669;">Payment Received</h2>
    <p>We successfully received your payment of <strong>$${amount}</strong>.</p>
    <p><strong>${credits} credits</strong> have been added to your account.</p>
    <p>Thank you for your business!</p>
  `;
  return sendEmail(to, subject, text, html);
}

export function sendCreationBlocked(to) {
  const subject = 'Action Required: Employee Creation Blocked';
  const text = `You attempted to create a new employee, but your account has insufficient credits. Please add credits to proceed.`;
  const html = `
    <h2 style="color: #dc2626;">Action Blocked</h2>
    <p>A manager attempted to create a new employee, but the action was blocked due to insufficient credits.</p>
    <p>Please add credits to your account to allow your team to grow.</p>
    <a href="${process.env.APP_URL || 'http://localhost:5173'}/billing" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;">Add Credits</a>
  `;
  return sendEmail(to, subject, text, html);
}

export function sendSubscriptionDeduction(to, deducted, remaining) {
  const subject = 'Monthly Subscription Deduction';
  const text = `We have deducted ${deducted} credits for your active employees. Remaining balance: ${remaining}.`;
  const html = `
    <h2>Subscription Update</h2>
    <p>We have deducted <strong>${deducted} credits</strong> for your active employees this month.</p>
    <p><strong>Remaining Balance:</strong> ${remaining} credits</p>
  `;
  return sendEmail(to, subject, text, html);
}

export function sendEmployeeCreatedDeduction(to, { employeeName, employeeEmail, deducted, remaining }) {
  const subject = 'New Employee Created - Credit Deducted';
  const text = `A new employee (${employeeName}) was created. ${deducted} credit has been deducted. Remaining balance: ${remaining}.`;
  const html = `
    <h2>New Employee Added</h2>
    <p>A new employee has been successfully added to your organization:</p>
    <ul>
      <li><strong>Name:</strong> ${employeeName}</li>
      <li><strong>Email:</strong> ${employeeEmail}</li>
    </ul>
    <p><strong>${deducted} credit</strong> has been deducted from your account.</p>
    <p><strong>Remaining Balance:</strong> ${remaining} credits</p>
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
  const html = `
    <h2>Monthly Billing Summary</h2>
    <p>Here is the summary for <strong>${period}</strong>:</p>
    <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">Active Employees</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${activeEmployees}</strong></td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">Credits Deducted</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${deducted}</strong></td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">Remaining Balance</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${remaining}</strong></td>
      </tr>
    </table>
    <p>Thank you for using Time Tracker.</p>
  `;
  return sendEmail(to, subject, text, html);
}

export function sendAccountSuspensionWarning(to) {
  const subject = 'Urgent: Account Suspension Warning';
  const text = `Your account credits have expired or reached zero. Your account will be suspended soon. Please recharge immediately.`;
  const html = `
    <h2 style="color: #dc2626;">Account Suspension Warning</h2>
    <p>Your account credits have expired or reached zero.</p>
    <p>To avoid service interruption for your team, please recharge your account immediately.</p>
    <a href="${process.env.APP_URL || 'http://localhost:5173'}/billing" style="display:inline-block;padding:10px 20px;background-color:#dc2626;color:white;text-decoration:none;border-radius:5px;">Recharge Now</a>
  `;
  return sendEmail(to, subject, text, html);
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
