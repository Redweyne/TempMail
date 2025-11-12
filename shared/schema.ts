import { z } from "zod";

// Alias schema - temporary or permanent email addresses
export interface Alias {
  id: string;
  email: string; // full email like "temp123@redweyne.com"
  prefix: string; // just the "temp123" part
  createdAt: string; // ISO timestamp
  expiresAt: string | null; // ISO timestamp, null for permanent aliases
  isPermanent: boolean; // true for permanent, false for temporary
}

export const insertAliasSchema = z.object({
  prefix: z.string().min(1).max(50).optional(), // optional, auto-generate if not provided
  isPermanent: z.boolean().default(false), // default to temporary
  ttlMinutes: z.number().int().min(1).max(120).default(30), // 1 min to 2 hours, default 30
}).refine(
  (data) => {
    // Validate ttlMinutes is a finite integer when provided
    if (data.ttlMinutes !== undefined && !Number.isFinite(data.ttlMinutes)) {
      return false;
    }
    return true;
  },
  {
    message: "ttlMinutes must be a valid integer",
  }
);

export type InsertAlias = z.infer<typeof insertAliasSchema>;

// Email schema - received messages
export interface Email {
  id: string;
  aliasId: string; // which alias received this
  from: string;
  to: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: string; // ISO timestamp
  read: boolean;
  raw: string; // original email data for debugging
}

export const insertEmailSchema = z.object({
  aliasId: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  bodyText: z.string().nullable(),
  bodyHtml: z.string().nullable(),
  raw: z.string(),
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;

// Outbound email schema for sending
export const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  from: z.string().email().optional(), // defaults to FROM_EMAIL from env
});

export type SendEmail = z.infer<typeof sendEmailSchema>;
