const { Resend } = require('resend');

async function sendWelcomeEmail({ email, username, tempPassword }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email skipped – no RESEND_API_KEY] Credentials for ${email}: ${username} / ${tempPassword}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Your Chosen Logistics Tracker Account',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222;">
          <h2 style="color:#1d4ed8;">Chosen Logistics Tracker</h2>
          <p>Your account has been created. Use the credentials below to sign in </p>
          <p>at <a href="https://chosenlogistics-production.up.railway.app/login">Chosen Logistics</a></p>
          <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <p style="margin:4px 0;"><strong>Username:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${username}</code></p>
            <p style="margin:4px 0;"><strong>Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
          </div>
          <p style="color:#dc2626;font-size:14px;">You will be required to change your password on first login.</p>
        </div>
      `,
    });
    if (error) console.error(`[Email failed] Resend error for ${email}:`, error.message);
    else console.log(`[Email sent] Welcome email delivered to ${email}`);
  } catch (err) {
    console.error(`[Email failed] Could not send to ${email}:`, err.message);
  }
}

module.exports = { sendWelcomeEmail };
