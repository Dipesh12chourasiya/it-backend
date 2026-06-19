import http from "http";

import app from "./app";

import { connectDB } from "./config/db";

import { env } from "./config/env";

import { initSocket } from "./socket/socket.server";

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  // Initialize Socket.IO on top of the HTTP server
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer();