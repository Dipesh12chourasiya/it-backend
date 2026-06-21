import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

// ── 1. Health check FIRST — must survive before any security middleware ─────
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 2. CORS — BEFORE helmet, BEFORE routes ─────────────────────────────────
//
// IMPORTANT: The `cors` middleware MUST run before `helmet()`.
// Helmet v8+ sets Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy,
// and Cross-Origin-Resource-Policy headers.  When these arrive on the same
// response as the Access-Control-Allow-Origin header that `cors` already
// attached, browsers interpret the combination as a stricter policy and
// block the request — even though the CORS headers are technically correct.
//
// By placing `cors()` first, its headers are written to the response, then
// helmet layers its own security headers on top without overwriting the
// CORS ones.
//
// IMPORTANT: The Vercel frontend URL MUST match exactly — protocol + subdomain.
// A trailing slash, a missing subdomain, or http vs https will all cause a
// hard block with no retry.
const allowedOrigins = [
  // ── Development ─────────────────────────────────────────────────────
  "http://localhost:4200",                 // Angular dev server
  "http://localhost:3000",                 // Alternate dev port
  "http://localhost:5000",                 // Backend dev (same-origin test)
  // ── Production ──────────────────────────────────────────────────────
  "https://interview-guard-frontend.vercel.app",  // ★ Vercel frontend
  "https://interview-guard-ai.vercel.app",        // Alternate Vercel domain
];

// Manual preflight handler — runs BEFORE the cors middleware to guarantee
// OPTIONS requests are answered immediately with the correct headers,
// even if Render's reverse proxy or helmet interferes.
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
    }
    return res.sendStatus(204);
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // In development, allow all origins
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      console.error(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400, // 24 hours — reduces preflight frequency
  })
);

// ── 3. Helmet — AFTER CORS so it doesn't overwrite CORS headers ────────────
// Explicitly disable Cross-Origin-* policies that conflict with the CORS
// flow.  Helmet's defaults for these were introduced in v8 and are designed
// for same-origin applications; they break cross-origin SPA ↔ API setups.
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(morgan("dev"));

// ── 4. Body parsing + routes ───────────────────────────────────────────────
app.use(express.json());
app.use("/api/v1", routes);

// ── 5. Error handler — LAST ────────────────────────────────────────────────
app.use(errorHandler);

export default app;