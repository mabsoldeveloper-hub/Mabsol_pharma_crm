import nodemailer from "nodemailer";

// Requires these env vars in .env.local:
// SMTP_HOST=smtp.your-provider.com
// SMTP_PORT=587
// SMTP_USER=your-smtp-username
// SMTP_PASS=your-smtp-password
// EMAIL_FROM="Mabsol Pharma CRM <no-reply@yourdomain.com>"

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for others
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Brand colors — kept in sync with login.css (:root variables)
const NAVY = "#343872";
const NAVY_DARK = "#12153A";
const ORANGE = "#fb8c00";
const ORANGE_LIGHT = "#ffb45c";
const SURFACE = "#F7F7FD";
const MUTED = "#6668A0";
const BORDER = "#ECEEF9";

export async function sendOtpEmail(email: string, otp: string) {
    const digits = otp.split("");

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Your Mabsol CRM verification code",
        html: `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:${SURFACE}; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid ${BORDER};">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(160deg, ${NAVY_DARK}, ${NAVY}); padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle; padding-right:8px;">
                      <div style="width:20px; height:20px; background:${ORANGE}; border-radius:5px;"></div>
                    </td>
                    <td style="vertical-align:middle; color:#ffffff; font-size:15px; font-weight:700; letter-spacing:-0.01em;">
                      Mabsol Pharma CRM
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 8px; color:${NAVY}; font-size:20px; font-weight:700; letter-spacing:-0.01em;">
                  Verify your login
                </h2>
                <p style="margin:0 0 24px; color:${MUTED}; font-size:14px; line-height:1.6;">
                  Use the code below to finish signing in to Mabsol Pharma CRM. This code is valid for the next 5 minutes.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    ${digits
                .map(
                    (d) => `
                    <td style="width:40px; height:48px; text-align:center; vertical-align:middle; background:${SURFACE}; border:1.5px solid ${BORDER}; border-radius:8px; font-family:'Courier New', monospace; font-size:22px; font-weight:700; color:${NAVY}; padding:0 4px;">
                      ${d}
                    </td>
                    <td style="width:6px;"></td>
                    `
                )
                .join("")}
                  </tr>
                </table>

                <p style="margin:0; color:${MUTED}; font-size:12.5px; line-height:1.6;">
                  Didn't request this code? You can safely ignore this email — your account is still secure.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 32px 28px; border-top:1px solid ${BORDER};">
                <p style="margin:0; color:#A6A8D2; font-size:11.5px;">
                  © ${new Date().getFullYear()} Mabsol Pharma CRM. Synced live with Marg.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `,
        text: `Your Mabsol CRM verification code is ${otp}. This code expires in 5 minutes. If you didn't request this, you can ignore this email.`,
    });
}