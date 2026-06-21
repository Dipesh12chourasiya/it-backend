import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../modules/auth/auth.model";
import { IMonitoringEvent } from "../modules/monitoring/monitoring.model";
import { setupWorkspaceSocket } from "../modules/workspace/workspace.socket";

// ── Allowed origins — MUST mirror app.ts exactly ───────────────────────
// If these two lists drift apart, Socket.IO will connect but HTTP
// requests (or vice-versa) will fail — causing confusing partial outages.
const SOCKET_ALLOWED_ORIGINS = [
  // ── Development ─────────────────────────────────────────────────────
  "http://localhost:4200",
  "http://localhost:3000",
  "http://localhost:5000",
  // ── Production ──────────────────────────────────────────────────────
  "https://interview-guard-frontend.vercel.app",  // ★ Vercel frontend
  "https://interview-guard-ai.vercel.app",        // Alternate Vercel domain
];

let io: Server;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    // ── CORS ──────────────────────────────────────────────────────────
    //
    // Socket.IO v4 handles pre-flight (OPTIONS) internally — we do NOT
    // need a manual OPTIONS handler here (that's only for Express).
    //
    // CRITICAL: `credentials: true` requires an explicit origin callback
    // that returns the actual origin string.  `origin: "*"` is illegal
    // when credentials are used — browsers reject it silently.
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, Postman,
        // some mobile WebViews, Socket.IO polling fallback)
        if (!origin) return callback(null, true);

        if (SOCKET_ALLOWED_ORIGINS.includes(origin)) {
          return callback(null, true);
        }

        // In development, allow all origins
        if (process.env.NODE_ENV !== "production") {
          return callback(null, true);
        }

        console.error(`[Socket.IO CORS] Blocked origin: ${origin}`);
        callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      // Socket.IO only needs GET (polling) and POST (polling + upgrade).
      // WebSocket upgrade is handled at the HTTP level, not CORS.
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },

    // ── Transport ─────────────────────────────────────────────────────
    //
    // Prefer WebSocket for low-latency signalling (WebRTC offer/answer,
    // code sync, presence).  Fall back to long-polling when WSS is
    // unavailable or blocked by a corporate proxy.
    //
    // Render's reverse proxy DOES support WebSocket upgrade, so
    // `allowUpgrades: false` is NOT needed.
    transports: ["websocket", "polling"],

    // ── Keep-alive pings (critical for Render's reverse proxy) ────────
    //
    // Render's nginx reverse-proxy has a ~60-second idle timeout.
    // Pings every 25 seconds guarantee the connection stays open.
    // `pingTimeout` MUST be less than `pingInterval` to avoid false
    // disconnects when the ping response is slightly delayed.
    pingInterval: 25000,   // 25 s  (< 60 s proxy timeout)
    pingTimeout: 20000,    // 20 s  (< pingInterval)

    // ── Reconnection / state recovery ─────────────────────────────────
    //
    // Allow the server to recover missed packets after a brief
    // disconnect (< 2 min).  This prevents a code-sync gap when a
    // candidate's browser briefly loses network during an interview.
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
  });

  // Authenticate socket connections via JWT
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      const user = await User.findById(decoded.id).select("_id name email role");
      if (!user) {
        return next(new Error("User not found"));
      }

      (socket as any).user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] ${user.role} "${user.name}" connected (${socket.id})`);

    // Setup workspace event handlers
    setupWorkspaceSocket(socket, user);

    // Join interview-specific rooms
    socket.on("join-interview", (interviewId: string) => {
      socket.join(`interview:${interviewId}`);
      console.log(`[Socket] ${user.name} (${user.role}) joined room interview:${interviewId}`);

      // Notify other peer in the room that a user joined
      socket.to(`interview:${interviewId}`).emit("peer-joined", {
        userId: user._id,
        userName: user.name,
        role: user.role,
        socketId: socket.id,
      });

      // Notify recruiters that a candidate joined
      if (user.role === "candidate") {
        socket.to(`interview:${interviewId}`).emit("candidate-joined", {
          candidateId: user._id,
          candidateName: user.name,
          candidateEmail: user.email,
          interviewId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // WebRTC Offer forwarding
    socket.on("webrtc-offer", (data: { interviewId: string; offer: any }) => {
      socket.to(`interview:${data.interviewId}`).emit("webrtc-offer", {
        offer: data.offer,
        senderId: socket.id,
        userName: user.name,
        role: user.role,
      });
    });

    // WebRTC Answer forwarding
    socket.on("webrtc-answer", (data: { interviewId: string; answer: any }) => {
      socket.to(`interview:${data.interviewId}`).emit("webrtc-answer", {
        answer: data.answer,
        senderId: socket.id,
      });
    });

    // WebRTC ICE Candidate forwarding
    socket.on("webrtc-ice-candidate", (data: { interviewId: string; candidate: any }) => {
      socket.to(`interview:${data.interviewId}`).emit("webrtc-ice-candidate", {
        candidate: data.candidate,
        senderId: socket.id,
      });
    });

    // Leave interview room
    socket.on("leave-interview", (interviewId: string) => {
      socket.leave(`interview:${interviewId}`);
      console.log(`[Socket] ${user.name} left room interview:${interviewId}`);

      socket.to(`interview:${interviewId}`).emit("peer-left", {
        userId: user._id,
        userName: user.name,
        role: user.role,
        socketId: socket.id,
      });

      if (user.role === "candidate") {
        socket.to(`interview:${interviewId}`).emit("candidate-left", {
          candidateId: user._id,
          candidateName: user.name,
          candidateEmail: user.email,
          interviewId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Catch unexpected disconnects to notify peers
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("interview:")) {
          socket.to(room).emit("peer-left", {
            userId: user._id,
            userName: user.name,
            role: user.role,
            socketId: socket.id,
          });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] ${user.name} disconnected (${socket.id})`);
    });
  });

  return io;
};

/**
 * Emit a monitoring event to all users in the interview room
 */
export const emitMonitoringEvent = (
  interviewId: string,
  event: IMonitoringEvent
): void => {
  if (!io) return;
  io.to(`interview:${interviewId}`).emit("monitoring-event", event);
};

/**
 * Emit a trust score update to all users in the interview room
 */
export const emitTrustScoreUpdate = (
  interviewId: string,
  data: { candidateId: string; score: number; eventType: string }
): void => {
  if (!io) return;
  io.to(`interview:${interviewId}`).emit("trust-score-updated", data);
};

export const getIO = (): Server => io;
