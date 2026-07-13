import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmailOTP(email: string, otp: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,

    to: email,

    subject: "Mabsol Pharma CRM - Email Verification OTP",

    html: `
<div style="font-family:Arial;padding:25px">

<h2>Mabsol Pharma CRM</h2>

<p>Hello,</p>

<p>Your Email Verification OTP is</p>

<h1 style="letter-spacing:6px;color:#0d6efd">
${otp}
</h1>

<p>

This OTP will expire in

<b>5 Minutes</b>

</p>

<p>

Please do not share this OTP with anyone.

</p>

<hr>

<small>

© Mabsol Pharma CRM

</small>

</div>
`,
  });
}