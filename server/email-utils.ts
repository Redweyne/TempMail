import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import type { InsertEmail } from "@shared/schema";

// Parse raw email data into structured format
export async function parseEmail(rawEmail: Buffer | string): Promise<{
  from: string;
  to: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
}> {
  const parsed = await simpleParser(rawEmail);

  // Handle from address (can be AddressObject or AddressObject[])
  const fromAddress = Array.isArray(parsed.from) 
    ? parsed.from[0]?.text 
    : parsed.from?.text;
  
  // Handle to address (can be AddressObject or AddressObject[])
  const toAddress = Array.isArray(parsed.to) 
    ? parsed.to[0]?.text 
    : parsed.to?.text;

  return {
    from: fromAddress || "unknown@sender.com",
    to: toAddress || "",
    subject: parsed.subject || "(No subject)",
    bodyText: parsed.text || null,
    bodyHtml: parsed.html ? String(parsed.html) : null,
  };
}

// Configure SendGrid SMTP transporter
export function createMailTransporter() {
  const {
    SMTP_HOST = "smtp.sendgrid.net",
    SMTP_PORT = "587",
    SMTP_USER = "apikey",
    SMTP_PASS,
  } = process.env;

  if (!SMTP_PASS) {
    throw new Error("SMTP_PASS environment variable is required");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: false, // use TLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

// Send email via SendGrid
export async function sendEmail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}) {
  const transporter = createMailTransporter();

  const {
    FROM_EMAIL = "noreply@redweyne.com",
    FROM_NAME = "Redweyne Mail",
  } = process.env;

  const from = options.from || `${FROM_NAME} <${FROM_EMAIL}>`;

  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  return info;
}
