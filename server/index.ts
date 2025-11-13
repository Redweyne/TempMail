import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Configure trust proxy for deployments behind reverse proxies
// TRUST_PROXY can be: "loopback" (default for VPS), number (hop count), or boolean
// Replit: defaults to 1 hop; VPS behind nginx/similar: use "loopback"
// Direct deployments without reverse proxy: leave unset or set to false
const trustProxyConfig = process.env.TRUST_PROXY 
  ? (process.env.TRUST_PROXY === 'true' ? true : 
     process.env.TRUST_PROXY === 'false' ? false :
     isNaN(Number(process.env.TRUST_PROXY)) ? process.env.TRUST_PROXY : 
     Number(process.env.TRUST_PROXY))
  : process.env.REPL_ID ? 1 : false;

if (trustProxyConfig !== false) {
  app.set('trust proxy', trustProxyConfig);
  log(`Trust proxy enabled: ${trustProxyConfig}`);
}

// Normalize BASE_PATH from environment (defaults to "/" for local dev)
const basePath = (process.env.BASE_PATH || "/").replace(/\/$/, "") || "/";

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Strip base path from logging to see clean /api/* paths
    const cleanPath = basePath !== "/" && path.startsWith(basePath) 
      ? path.slice(basePath.length) || "/"
      : path;
    
    if (cleanPath.startsWith("/api")) {
      let logLine = `${req.method} ${cleanPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create a scoped app that will be mounted under basePath
  const scopedApp = express();
  
  // Apply trust proxy to scopedApp (where middleware actually runs)
  if (trustProxyConfig !== false) {
    scopedApp.set('trust proxy', trustProxyConfig);
  }
  
  // Register routes on the scoped app
  await registerRoutes(scopedApp);

  scopedApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const server = createServer(app);
  
  if (app.get("env") === "development") {
    await setupVite(scopedApp, server);
  } else {
    serveStatic(scopedApp);
  }

  // Mount the scoped app under basePath on the root app
  app.use(basePath, scopedApp);

  // Setup automatic cleanup for expired temporary aliases and emails
  // Run every 5 minutes in production, every 30 seconds in development
  const cleanupInterval = app.get("env") === "development" ? 30000 : 5 * 60 * 1000;
  
  setInterval(async () => {
    try {
      const { storage } = await import("./storage");
      const deletedAliases = storage.deleteExpiredAliases();
      const deletedEmails = storage.deleteExpiredEmails();
      
      if (deletedAliases > 0 || deletedEmails > 0) {
        log(`Auto-cleanup: deleted ${deletedAliases} expired temporary aliases, ${deletedEmails} emails`);
      }
    } catch (error) {
      console.error("Error in automatic cleanup:", error);
    }
  }, cleanupInterval);
  
  log(`Automatic cleanup enabled: running every ${cleanupInterval / 1000}s`);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}${basePath !== "/" ? ` with base path: ${basePath}` : ""}`);
  });
})();
