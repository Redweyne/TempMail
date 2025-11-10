import { z } from "zod";

// Alias schema - temporary email addresses
export interface Alias {
  id: string;
  email: string; // full email like "temp123@redweyne.com"
  prefix: string; // just the "temp123" part
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
}

export const insertAliasSchema = z.object({
  prefix: z.string().min(1).max(50).optional(), // optional, auto-generate if not provided
  ttlMinutes: z.number().int().min(1).max(120).default(30), // 1 min to 2 hours
});

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
