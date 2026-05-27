const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendWelcomeEmail({ email, tempPassword }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[Email skipped – SMTP not configured] Credentials for ${email}: ${tempPassword}`);
    return;
  }

  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Your Chosen Logistics Tracker Account',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222;">
          <h2 style="color:#1d4ed8;">Chosen Logistics Tracker</h2>
          <p>Your account has been created. Use the credentials below to sign in.</p>
          <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin:4px 0;"><strong>Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
          </div>
          <p style="color:#dc2626;font-size:14px;">You will be required to change your password on first login.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error(`[Email failed] Could not send to ${email}:`, err.message);
  }
}

module.exports = { sendWelcomeEmail };
