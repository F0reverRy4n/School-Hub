import nodemailer from "nodemailer";

const ADMIN_EMAIL = "f0reverry4n@gmail.com";

function createTransport() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

async function sendEmail(to: string, subject: string, html: string) {
  const transport = createTransport();
  if (!transport) {
    console.log(`[EMAIL - no SMTP configured]\nTo: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, "")}`);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function sendVerificationCode(email: string, code: string) {
  await sendEmail(
    email,
    "Your Teacher Verification Code",
    `<p>Your 6-digit verification code is:</p>
     <h2 style="font-size:32px;letter-spacing:8px;font-family:monospace;">${code}</h2>
     <p>This code expires in 10 minutes.</p>`
  );
}

export async function sendSchoolRequestNotification(schoolName: string, requestedByEmail: string) {
  await sendEmail(
    ADMIN_EMAIL,
    `School Request: ${schoolName}`,
    `<p>A teacher has requested to add a new school:</p>
     <ul>
       <li><strong>School Name:</strong> ${schoolName}</li>
       <li><strong>Requested by:</strong> ${requestedByEmail}</li>
     </ul>
     <p>Please log in to the admin dashboard to approve or deny this request.</p>`
  );
}
