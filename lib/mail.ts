import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Brand Colors
const NAVY = "#343872";
const NAVY_DARK = "#12153A";
const ORANGE = "#fb8c00";
const SURFACE = "#F7F7FD";
const MUTED = "#6668A0";
const BORDER = "#ECEEF9";

export async function sendEmailOTP(email: string, otp: string) {
  try {
    await transporter.verify();
    console.log("SMTP Connected");

    const digits = otp.split("");

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Mabsol Pharma CRM - Email Verification OTP",

      html: `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:${SURFACE}; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE}; padding:32px 16px;">
      <tr>
        <td align="center">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:420px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid ${BORDER};">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(160deg, ${NAVY_DARK}, ${NAVY}); padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:8px;">
                      <div style="width:20px; height:20px; background:${ORANGE}; border-radius:5px;"></div>
                    </td>
                    <td style="color:#ffffff; font-size:15px; font-weight:700;">
                      Mabsol Pharma CRM
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 10px; color:${NAVY}; font-size:20px; font-weight:700;">
                  Email Verification
                </h2>

                <p style="margin:0 0 24px; color:${MUTED}; font-size:14px; line-height:1.6;">
                  Use the verification code below to confirm your email address and continue using Mabsol Pharma CRM.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    ${digits
          .map(
            (d) => `
                      <td
                        style="
                          width:40px;
                          height:48px;
                          text-align:center;
                          vertical-align:middle;
                          background:${SURFACE};
                          border:1.5px solid ${BORDER};
                          border-radius:8px;
                          font-family:'Courier New', monospace;
                          font-size:22px;
                          font-weight:700;
                          color:${NAVY};
                        ">
                        ${d}
                      </td>
                      <td style="width:6px;"></td>
                    `
          )
          .join("")}
                  </tr>
                </table>

                <p style="margin:0 0 12px; color:${MUTED}; font-size:13px;">
                  This verification code will expire in <strong>5 minutes</strong>.
                </p>

                <p style="margin:0; color:${MUTED}; font-size:12.5px; line-height:1.6;">
                  If you did not request this verification code, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 32px 28px; border-top:1px solid ${BORDER};">
                <p style="margin:0; color:#A6A8D2; font-size:11.5px;">
                  © ${new Date().getFullYear()} Mabsol Pharma CRM. All Rights Reserved.
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

      text: `Your Mabsol Pharma CRM email verification code is ${otp}. This code expires in 5 minutes.`,
    });

    console.log("Mail Sent:", info.messageId);

    return true;
  } catch (err: any) {
    console.error("MAIL ERROR");
    console.error(err);
    throw err;
  }
}