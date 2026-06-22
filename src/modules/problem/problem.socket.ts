import { Socket } from "socket.io";
import {
  getCurrentProblem,
  createProblem,
  updateProblem,
  deleteProblem,
} from "./problem.service";
import type {
  CreateProblemPayload,
  UpdateProblemPayload,
  GetProblemPayload,
  DeleteProblemPayload,
  ProblemSyncData,
} from "./problem.types";

/**
 * Broadcast the current problem state to everyone in the interview room.
 * Sends `problem:sync` to the room identified by `roomId`.
 */
const broadcastProblemSync = (
  socket: Socket,
  roomId: string,
  problem: ProblemSyncData["problem"]
): void => {
  const payload: ProblemSyncData = {
    roomId,
    problem,
    updatedAt: new Date(),
  };

  // Broadcast to ALL users in the room (including sender for confirmation)
  socket.to(`interview:${roomId}`).emit("problem:sync", payload);

  // Also emit back to sender so they get confirmation
  socket.emit("problem:sync", payload);
};

/**
 * Setup problem socket event handlers.
 *
 * Called from socket.server.ts during connection setup — follows the same
 * pattern as `setupWorkspaceSocket`.
 */
export const setupProblemSocket = (socket: Socket, user: any): void => {
  // ── problem:create ────────────────────────────────────────────────────
  socket.on("problem:create", async (data: CreateProblemPayload) => {
    try {
      // Auth: only recruiters can create problems
      if (user.role !== "recruiter") {
        socket.emit("problem:error", {
          success: false,
          message: "Only recruiters can create problems",
          code: "UNAUTHORIZED",
        });
        return;
      }

      // Validate required fields
      if (!data.roomId || !data.roomId.trim()) {
        socket.emit("problem:error", {
          success: false,
          message: "roomId is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      if (!data.title || !data.title.trim()) {
        socket.emit("problem:error", {
          success: false,
          message: "title is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      if (!data.description || !data.description.trim()) {
        socket.emit("problem:error", {
          success: false,
          message: "description is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      // Create problem in database
      const problem = await createProblem(data.roomId, {
        title: data.title.trim(),
        description: data.description.trim(),
        examples: data.examples?.trim(),
        constraints: data.constraints?.trim(),
      });

      console.log(
        `[Socket] Problem created in room ${data.roomId} by ${user.name} (v${problem.version})`
      );

      // Broadcast to entire room
      broadcastProblemSync(socket, data.roomId, problem);
    } catch (error: any) {
      console.error("[Socket] problem:create error:", error.message);
      socket.emit("problem:error", {
        success: false,
        message: error.message || "Failed to create problem",
        code: "SERVER_ERROR",
      });
    }
  });

  // ── problem:update ────────────────────────────────────────────────────
  socket.on("problem:update", async (data: UpdateProblemPayload) => {
    try {
      // Auth: only recruiters can update problems
      if (user.role !== "recruiter") {
        socket.emit("problem:error", {
          success: false,
          message: "Only recruiters can update problems",
          code: "UNAUTHORIZED",
        });
        return;
      }

      // Validate roomId
      if (!data.roomId || !data.roomId.trim()) {
        socket.emit("problem:error", {
          success: false,
          message: "roomId is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      // At least one field must be provided
      if (
        data.title === undefined &&
        data.description === undefined &&
        data.examples === undefined &&
        data.constraints === undefined
      ) {
        socket.emit("problem:error", {
          success: false,
          message: "At least one field must be provided to update",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      // Update problem in database
      const problem = await updateProblem(data.roomId, {
        title: data.title?.trim(),
        description: data.description?.trim(),
        examples: data.examples?.trim(),
        constraints: data.constraints?.trim(),
      });

      console.log(
        `[Socket] Problem updated in room ${data.roomId} by ${user.name} (v${problem.version})`
      );

      // Broadcast to entire room
      broadcastProblemSync(socket, data.roomId, problem);
    } catch (error: any) {
      console.error("[Socket] problem:update error:", error.message);
      socket.emit("problem:error", {
        success: false,
        message: error.message || "Failed to update problem",
        code: "SERVER_ERROR",
      });
    }
  });

  // ── problem:get ───────────────────────────────────────────────────────
  socket.on("problem:get", async (data: GetProblemPayload) => {
    try {
      if (!data.roomId || !data.roomId.trim()) {
        socket.emit("problem:error", {
          success: false,
          message: "roomId is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      const problem = await getCurrentProblem(data.roomId);

      // Send directly to the requesting client only
      socket.emit("problem:sync", {
        roomId: data.roomId,
        problem,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      console.error("[Socket] problem:get error:", error.message);
      socket.emit("problem:error", {
        success: false,
        message: error.message || "Failed to get problem",
        code: "SERVER_ERROR",
      });
    }
  });

  // ── problem:delete ────────────────────────────────────────────────────
  socket.on("problem:delete", async (data: DeleteProblemPayload) => {
    try {
      // Auth: only recruiters can delete problems
      if (user.role !== "recruiter") {
        socket.emit("problem:error", {
          success: false,
          message: "Only recruiters can delete problems",
          code: "UNAUTHORIZED",
        });
        return;
      }

      if (!data.roomId || !data.roomId.trim()) {
        socket.emit("problem:error", {
          success: false,
          message: "roomId is required",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      await deleteProblem(data.roomId);

      console.log(
        `[Socket] Problem deleted in room ${data.roomId} by ${user.name}`
      );

      // Broadcast null state to entire room
      broadcastProblemSync(socket, data.roomId, null);
    } catch (error: any) {
      console.error("[Socket] problem:delete error:", error.message);
      socket.emit("problem:error", {
        success: false,
        message: error.message || "Failed to delete problem",
        code: "SERVER_ERROR",
      });
    }
  });
};
