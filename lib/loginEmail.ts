import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const NAVY = "#343872";
const ORANGE = "#fb8c00";
const SURFACE = "#F7F7FD";
const BORDER = "#ECEEF9";
const MUTED = "#6668A0";

export async function sendLoginOTPEmail(
  email: string,
  otp: string
) {
  const digits = otp.split("");

  const info = await transporter.sendMail({

    from: process.env.SMTP_FROM,

    to: email,

    subject: "Login Verification - Mabsol Pharma CRM",

    html: `
<!DOCTYPE html>

<html>

<body style="margin:0;background:${SURFACE};font-family:Arial">

<div style="max-width:600px;margin:auto;background:white;border-radius:12px;border:1px solid ${BORDER};overflow:hidden">

<div style="background:${NAVY};padding:25px;text-align:center">

<h2 style="color:white;margin:0">

Mabsol Pharma CRM

</h2>

</div>

<div style="padding:30px">

<h3>

Login Verification

</h3>

<p>

Hello,

</p>

<p>

Someone is trying to login to your account.

Use the following OTP to continue.

</p>

<div style="text-align:center;margin:30px 0">

${digits
  .map(
    (d) => `
<span
style="
display:inline-block;
width:42px;
height:50px;
line-height:50px;
border:1px solid ${BORDER};
font-size:24px;
font-weight:bold;
margin:2px;
background:${SURFACE};
border-radius:8px;
color:${NAVY};
">
${d}
</span>
`
  )
  .join("")}

</div>

<p>

OTP is valid for

<b>5 Minutes</b>

</p>

<p>

If you didn't request this login,

please ignore this email.

</p>

</div>

<div style="padding:15px;background:#fafafa;border-top:1px solid ${BORDER};text-align:center;font-size:12px;color:${MUTED}">

© ${new Date().getFullYear()} Mabsol Pharma CRM

</div>

</div>

</body>

</html>
`,

    text: `Your Login OTP is ${otp}`,

  });

  console.log("=========== LOGIN EMAIL ===========");

  console.log(info);

  console.log("===================================");

  return info;
}