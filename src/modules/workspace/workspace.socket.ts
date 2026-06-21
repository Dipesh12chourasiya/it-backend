import { Socket } from "socket.io";
import { getOrCreateWorkspace, updateCode, updateWhiteboard } from "./workspace.service";

/**
 * Setup workspace socket event handlers
 */
export const setupWorkspaceSocket = (socket: Socket, user: any): void => {
  // User joins workspace room
  socket.on("workspace-join", async (interviewId: string) => {
    try {
      socket.join(`workspace:${interviewId}`);
      console.log(
        `[Socket] ${user.name} (${user.role}) joined workspace:${interviewId}`
      );

      // Send current workspace state to the user
      const workspace = await getOrCreateWorkspace(interviewId);
      socket.emit("workspace-sync", {
        interviewId,
        language: workspace.language,
        code: workspace.code,
        whiteboardData: workspace.whiteboardData,
      });
    } catch (error) {
      console.error("[Socket] workspace-join error:", error);
    }
  });

  // User leaves workspace room
  socket.on("workspace-leave", (interviewId: string) => {
    socket.leave(`workspace:${interviewId}`);
    console.log(
      `[Socket] ${user.name} left workspace:${interviewId}`
    );
  });

  // Real-time code change
  socket.on("code-change", async (data: { interviewId: string; code: string; language: string }) => {
    try {
      // ── Broadcast to OTHER users only ──────────────────────────────
      //
      // `socket.to(room)` sends to every socket in the room EXCEPT
      // the sender.  This is the primary echo-prevention mechanism.
      //
      // We also include `senderId` so the client can apply a second
      // layer of defense — if a duplicate event somehow arrives (e.g.
      // from a reconnection), the client can ignore it.
      socket.to(`workspace:${data.interviewId}`).emit("code-change", {
        interviewId: data.interviewId,
        code: data.code,
        language: data.language,
        senderId: user._id.toString(),
        senderSocketId: socket.id,
      });

      // Debounced save to database (handled by the frontend with auto-save)
    } catch (error) {
      console.error("[Socket] code-change error:", error);
    }
  });

  // Real-time whiteboard change
  socket.on("whiteboard-change", async (data: { interviewId: string; whiteboardData: any }) => {
    try {
      // Broadcast to OTHER users only
      socket.to(`workspace:${data.interviewId}`).emit("whiteboard-change", {
        interviewId: data.interviewId,
        whiteboardData: data.whiteboardData,
        senderId: user._id.toString(),
        senderSocketId: socket.id,
      });

      // Debounced save to database (handled by the frontend with auto-save)
    } catch (error) {
      console.error("[Socket] whiteboard-change error:", error);
    }
  });

  // Save workspace state to database
  socket.on("workspace-save", async (data: { interviewId: string; code?: string; language?: string; whiteboardData?: any }) => {
    try {
      if (data.code !== undefined) {
        await updateCode(data.interviewId, data.code, data.language || "javascript");
      }
      if (data.whiteboardData !== undefined) {
        await updateWhiteboard(data.interviewId, data.whiteboardData);
      }
      console.log(`[Socket] Workspace saved for interview:${data.interviewId}`);
    } catch (error) {
      console.error("[Socket] workspace-save error:", error);
    }
  });
};
