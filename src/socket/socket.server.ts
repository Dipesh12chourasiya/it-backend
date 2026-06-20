import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../modules/auth/auth.model";
import { IMonitoringEvent } from "../modules/monitoring/monitoring.model";

let io: Server;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
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
  data: { candidateId: string; candidateName: string; score: number }
): void => {
  if (!io) return;
  io.to(`interview:${interviewId}`).emit("trust-score-updated", data);
};

export const getIO = (): Server => io;
