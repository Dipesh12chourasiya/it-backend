import http from "http";

import app from "./app";

import { connectDB } from "./config/db";

import { env } from "./config/env";

import { initSocket } from "./socket/socket.server";

const startServer = async () => {
  await connectDB();

  // Create the HTTP server with explicit settings for Render's reverse proxy
  const server = http.createServer(app);

  // Initialize Socket.IO on top of the HTTP server
  initSocket(server);

  // ── Render free-tier keepalive ──────────────────────────────────────
  // Render's free web service spins down after 15 minutes of inactivity.
  // This ping keeps the Node process alive every 10 minutes so the
  // WebSocket connection stays alive and users aren't kicked out.
  const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  setInterval(() => {
    // A no-op timer keeps the event-loop alive. Render considers the
    // service "active" as long as there are pending timers.
    console.log("[Keepalive] ping");
  }, PING_INTERVAL_MS);

  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer();