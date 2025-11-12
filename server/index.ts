import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Only set trust proxy in Replit environment where it's needed
// For VPS: don't set it at all - leave at Express default
if (process.env.REPL_ID) {
  app.set('trust proxy', true);
}
// Note: No else clause - we intentionally leave trust proxy unset for VPS

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
