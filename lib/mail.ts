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

export async function sendEmailOTP(email: string, otp: string) {
  try {
    await transporter.verify();
    console.log("SMTP Connected");

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Mabsol Pharma CRM - Email Verification OTP",
      html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Mabsol Pharma CRM</h2>

        <p>Your verification code is</p>

        <h1 style="letter-spacing:5px;color:#0d6efd">
          ${otp}
        </h1>

        <p>This OTP will expire in <b>5 Minutes</b></p>

        <hr>

        <small>© Mabsol Pharma CRM</small>

      </div>
      `,
    });

    console.log("Mail Sent:", info.messageId);

    return true;

  } catch (err: any) {

    console.error("MAIL ERROR");

    console.error(err);

    throw err;
  }
}