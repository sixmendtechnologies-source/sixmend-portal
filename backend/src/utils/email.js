import nodemailer from "nodemailer";

export async function sendActivationEmail({ to, name, token }) {
  const portalUrl = process.env.PORTAL_URL || "https://manage.sixmend.com";
  const link = `${portalUrl}/activate/${token}`;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[INVITE] SMTP not configured. Activation link for ${to}:\n  ${link}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SixPortal" <${process.env.SMTP_USER}>`,
    to,
    subject: "Activate your SixPortal account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb">
        <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
          <div style="width:44px;height:44px;background:#8bc34a;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px">
            <span style="color:#ffffff;font-size:16px;font-weight:700;line-height:1">SP</span>
          </div>
          <h2 style="color:#1a1f2e;margin:0 0 8px;font-size:20px">You're invited to SixPortal</h2>
          <p style="color:#6b7280;margin:0 0 24px;font-size:14px;line-height:1.6">
            Hi ${name || "there"},<br>
            You've been invited to access the SixPortal workspace. Click the button below to activate your account and set your password.
          </p>
          <a href="${link}" style="display:inline-block;padding:12px 28px;background:#8bc34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
            Activate Account
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:28px;margin-bottom:4px">
            This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="color:#d1d5db;font-size:11px;word-break:break-all;margin:0">${link}</p>
        </div>
      </div>
    `,
  });
}
