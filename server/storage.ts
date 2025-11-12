import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import type { Alias, Email, InsertAlias, InsertEmail } from "@shared/schema";
import dayjs from "dayjs";

export interface IStorage {
  // Alias methods
  createAlias(data: InsertAlias): Alias;
  getAllAliases(): Alias[];
  getAliasByEmail(email: string): Alias | undefined;
  getAliasById(id: string): Alias | undefined;
  deleteAlias(id: string): void;
  
  // Email methods
  createEmail(data: InsertEmail): Email;
  getEmailsByAliasId(aliasId: string): Email[];
  getEmailById(id: string): Email | undefined;
  markEmailAsRead(id: string): void;
  deleteEmail(id: string): void;
  
  // Cleanup methods
  deleteExpiredAliases(): number;
  deleteExpiredEmails(): number;
}

export class SqliteStorage implements IStorage {
  private db: Database.Database;

  constructor() {
    this.db = new Database("emails.db");
    this.runMigrations();
    this.initTables();
  }

  private runMigrations() {
    try {
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='aliases'").get();
      
      if (tables) {
        const columns = this.db.prepare("PRAGMA table_info(aliases)").all() as any[];
        const hasIsPermanent = columns.some((col) => col.name === 'isPermanent');
        
        if (!hasIsPermanent) {
          console.log('Running migration: Adding isPermanent column to aliases table');
          this.db.exec(`
            ALTER TABLE aliases ADD COLUMN isPermanent INTEGER NOT NULL DEFAULT 0;
          `);
          
          console.log('Migration: Making expiresAt nullable');
          this.db.exec(`
            CREATE TABLE aliases_new (
              id TEXT PRIMARY KEY,
              email TEXT NOT NULL UNIQUE,
              prefix TEXT NOT NULL,
              createdAt TEXT NOT NULL,
              expiresAt TEXT,
              isPermanent INTEGER NOT NULL DEFAULT 0
            );
            
            INSERT INTO aliases_new (id, email, prefix, createdAt, expiresAt, isPermanent)
            SELECT id, email, prefix, createdAt, expiresAt, 0 FROM aliases;
            
            DROP TABLE aliases;
            ALTER TABLE aliases_new RENAME TO aliases;
          `);
          console.log('Migration completed successfully');
        }
      }
    } catch (error) {
      console.log('Migration not needed or already applied', error);
    }
  }

  private initTables() {
    // Aliases table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS aliases (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        prefix TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        expiresAt TEXT,
        isPermanent INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Emails table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        aliasId TEXT NOT NULL,
        "from" TEXT NOT NULL,
        "to" TEXT NOT NULL,
        subject TEXT NOT NULL,
        bodyText TEXT,
        bodyHtml TEXT,
        receivedAt TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        raw TEXT NOT NULL,
        FOREIGN KEY (aliasId) REFERENCES aliases(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_emails_aliasId ON emails(aliasId);
      CREATE INDEX IF NOT EXISTS idx_aliases_expiresAt ON aliases(expiresAt);
      CREATE INDEX IF NOT EXISTS idx_emails_receivedAt ON emails(receivedAt);
    `);
  }

  // Alias methods
  createAlias(data: InsertAlias): Alias {
    const id = randomUUID();
    let prefix = data.prefix;

    // Auto-generate prefix if not provided
    if (!prefix) {
      const prefixType = data.isPermanent ? 'perm' : 'temp';
      prefix = `${prefixType}-${randomUUID().slice(0, 8)}`;
    }

    const email = `${prefix}@redweyne.com`;
    const createdAt = new Date().toISOString();
    const isPermanent = data.isPermanent ? 1 : 0;
    const expiresAt = data.isPermanent 
      ? null 
      : dayjs().add(data.ttlMinutes || 30, "minute").toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO aliases (id, email, prefix, createdAt, expiresAt, isPermanent)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, email, prefix, createdAt, expiresAt, isPermanent);

    const inserted = this.getAliasById(id);
    if (!inserted) {
      throw new Error("Failed to create alias");
    }
    return inserted;
  }

  getAllAliases(): Alias[] {
    const stmt = this.db.prepare(`
      SELECT * FROM aliases
      ORDER BY createdAt DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      ...row,
      isPermanent: row.isPermanent === 1,
    }));
  }

  getAliasByEmail(email: string): Alias | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM aliases WHERE email = ?
    `);

    const row = stmt.get(email) as any;
    if (!row) return undefined;

    return {
      ...row,
      isPermanent: row.isPermanent === 1,
    };
  }

  getAliasById(id: string): Alias | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM aliases WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      isPermanent: row.isPermanent === 1,
    };
  }

  deleteAlias(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM aliases WHERE id = ?`);
    stmt.run(id);
  }

  // Email methods
  createEmail(data: InsertEmail): Email {
    const id = randomUUID();
    const receivedAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO emails (id, aliasId, "from", "to", subject, bodyText, bodyHtml, receivedAt, read, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    stmt.run(
      id,
      data.aliasId,
      data.from,
      data.to,
      data.subject,
      data.bodyText,
      data.bodyHtml,
      receivedAt,
      data.raw
    );

    return {
      id,
      aliasId: data.aliasId,
      from: data.from,
      to: data.to,
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      receivedAt,
      read: false,
      raw: data.raw,
    };
  }

  getEmailsByAliasId(aliasId: string): Email[] {
    const stmt = this.db.prepare(`
      SELECT * FROM emails
      WHERE aliasId = ?
      ORDER BY receivedAt DESC
    `);

    const rows = stmt.all(aliasId) as any[];
    return rows.map((row) => ({
      ...row,
      read: row.read === 1,
    }));
  }

  getEmailById(id: string): Email | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM emails WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      read: row.read === 1,
    };
  }

  markEmailAsRead(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE emails SET read = 1 WHERE id = ?
    `);
    stmt.run(id);
  }

  deleteEmail(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM emails WHERE id = ?`);
    stmt.run(id);
  }

  // Cleanup methods - only delete temporary aliases and their emails
  deleteExpiredAliases(): number {
    const now = new Date().toISOString();

    // First delete associated emails from expired temporary aliases
    const emailStmt = this.db.prepare(`
      DELETE FROM emails
      WHERE aliasId IN (
        SELECT id FROM aliases 
        WHERE isPermanent = 0 AND expiresAt IS NOT NULL AND expiresAt <= ?
      )
    `);
    emailStmt.run(now);

    // Then delete expired temporary aliases only
    const aliasStmt = this.db.prepare(`
      DELETE FROM aliases 
      WHERE isPermanent = 0 AND expiresAt IS NOT NULL AND expiresAt <= ?
    `);

    const result = aliasStmt.run(now);
    return result.changes;
  }

  deleteExpiredEmails(): number {
    // Delete emails whose parent temporary alias has expired
    const stmt = this.db.prepare(`
      DELETE FROM emails
      WHERE aliasId IN (
        SELECT id FROM aliases 
        WHERE isPermanent = 0 AND expiresAt IS NOT NULL AND expiresAt <= ?
      )
    `);

    const result = stmt.run(new Date().toISOString());
    return result.changes;
  }
}

export const storage = new SqliteStorage();
