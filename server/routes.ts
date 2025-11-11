import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseEmail, sendEmail } from "./email-utils";
import { insertAliasSchema, sendEmailSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // disable for development
  }));
  app.use(cors());
  app.use(morgan("combined"));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  });

  const inboundLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit inbound webhook to 30 requests per minute
  });

  // Apply rate limiting to API routes
  app.use("/api", apiLimiter);

  // GET /api/aliases - Get all aliases
  app.get("/api/aliases", (req, res) => {
    try {
      const aliases = storage.getAllAliases();
      res.json(aliases);
    } catch (error: any) {
      console.error("Error fetching aliases:", error);
      res.status(500).json({ message: "Failed to fetch aliases" });
    }
  });

  // POST /api/aliases - Create new alias
  app.post("/api/aliases", (req, res) => {
    try {
      const validation = insertAliasSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.errors,
        });
      }

      const alias = storage.createAlias(validation.data);
      res.status(201).json(alias);
    } catch (error: any) {
      console.error("Error creating alias:", error);
      
      // Check for unique constraint violation
      if (error.message?.includes("UNIQUE constraint failed")) {
        return res.status(409).json({
          message: "This email prefix is already in use. Please try another one.",
        });
      }

      res.status(500).json({ message: "Failed to create alias" });
    }
  });

  // GET /api/aliases/:id/emails - Get emails for an alias
  app.get("/api/aliases/:id/emails", (req, res) => {
    try {
      const { id } = req.params;

      // Verify alias exists
      const alias = storage.getAliasById(id);
      if (!alias) {
        return res.status(404).json({ message: "Alias not found" });
      }

      const emails = storage.getEmailsByAliasId(id);
      res.json(emails);
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  // GET /api/emails/:id - Get single email
  app.get("/api/emails/:id", (req, res) => {
    try {
      const { id } = req.params;

      const email = storage.getEmailById(id);
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }

      res.json(email);
    } catch (error: any) {
      console.error("Error fetching email:", error);
      res.status(500).json({ message: "Failed to fetch email" });
    }
  });

  // PATCH /api/emails/:id/read - Mark email as read
  app.patch("/api/emails/:id/read", (req, res) => {
    try {
      const { id } = req.params;

      const email = storage.getEmailById(id);
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }

      storage.markEmailAsRead(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error marking email as read:", error);
      res.status(500).json({ message: "Failed to mark email as read" });
    }
  });

  // DELETE /api/emails/:id - Delete email
  app.delete("/api/emails/:id", (req, res) => {
    try {
      const { id } = req.params;

      const email = storage.getEmailById(id);
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }

      storage.deleteEmail(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting email:", error);
      res.status(500).json({ message: "Failed to delete email" });
    }
  });

  // POST /api/inbound - Receive inbound emails from Cloudflare Worker
  // Use text parser for raw email data
  app.post("/api/inbound", 
    express.text({ type: 'text/plain', limit: '10mb' }),
    inboundLimiter, 
    async (req, res) => {
    try {
      // Verify shared secret
      const inboundSecret = req.headers["x-inbound-secret"];
      const expectedSecret = process.env.INBOUND_SHARED_SECRET;

      if (!expectedSecret) {
        console.error("INBOUND_SHARED_SECRET not configured");
        return res.status(500).json({ message: "Server configuration error" });
      }

      if (inboundSecret !== expectedSecret) {
        console.warn("Invalid inbound secret received");
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get raw email - it comes as text body from Cloudflare Worker
      const rawEmail = req.body;

      if (!rawEmail || typeof rawEmail !== 'string') {
        return res.status(400).json({ message: "Invalid email data" });
      }

      const parsed = await parseEmail(rawEmail);

      // Extract recipient email and find matching alias
      const recipientEmail = parsed.to.match(/[\w.-]+@redweyne\.com/)?.[0];
      if (!recipientEmail) {
        console.warn("No valid recipient found in email");
        return res.status(400).json({ message: "Invalid recipient" });
      }

      const alias = storage.getAliasByEmail(recipientEmail);
      if (!alias) {
        console.warn(`No alias found for ${recipientEmail}`);
        return res.status(404).json({ message: "Alias not found" });
      }

      // Check if alias is expired
      const now = new Date();
      const expiresAt = new Date(alias.expiresAt);
      if (now > expiresAt) {
        console.warn(`Alias ${recipientEmail} has expired`);
        return res.status(410).json({ message: "Alias expired" });
      }

      // Store email
      const email = storage.createEmail({
        aliasId: alias.id,
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        bodyText: parsed.bodyText,
        bodyHtml: parsed.bodyHtml,
        raw: Buffer.from(rawEmail).toString("base64"), // store as base64
      });

      console.log(`Email received for ${recipientEmail}: ${parsed.subject}`);
      res.status(201).json({ message: "Email received", emailId: email.id });
    } catch (error: any) {
      console.error("Error processing inbound email:", error);
      res.status(500).json({ message: "Failed to process email" });
    }
  });

  // GET /api/cleanup - Manual cleanup endpoint (also run via cron)
  app.get("/api/cleanup", (req, res) => {
    try {
      const deletedAliases = storage.deleteExpiredAliases();
      const deletedEmails = storage.deleteExpiredEmails();

      console.log(`Cleanup: deleted ${deletedAliases} aliases, ${deletedEmails} emails`);

      res.json({
        message: "Cleanup completed",
        deletedAliases,
        deletedEmails,
      });
    } catch (error: any) {
      console.error("Error during cleanup:", error);
      res.status(500).json({ message: "Cleanup failed" });
    }
  });

  // POST /api/send - Send outbound email
  app.post("/api/send", async (req, res) => {
    try {
      const validation = sendEmailSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.errors,
        });
      }

      const { to, subject, text, html, from } = validation.data;

      const info = await sendEmail({
        to,
        subject,
        text,
        html,
        from,
      });

      res.status(200).json({
        message: "Email sent successfully",
        messageId: info.messageId,
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({
        message: "Failed to send email",
        error: error.message,
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
