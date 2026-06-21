import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

// ── Render health check (must be registered BEFORE helmet to avoid issues) ──
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── CORS — must allow the production Vercel frontend ────────────────────────
const allowedOrigins = [
  "http://localhost:4200",                // Angular dev server
  "http://localhost:3000",
  "https://interview-guard-ai.vercel.app", // production Vercel (adjust if different)
  // Add any custom Vercel domains here
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // In development, allow all origins
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(helmet());
app.use(morgan("dev"));

app.use("/api/v1", routes);

app.use(errorHandler);

export default app;