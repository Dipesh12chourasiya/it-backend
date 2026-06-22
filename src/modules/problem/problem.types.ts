// ── Problem event payloads ──────────────────────────────────────────────

/** Payload sent by recruiter to create a new problem */
export interface CreateProblemPayload {
  roomId: string;
  title: string;
  description: string;
  examples?: string;
  constraints?: string;
}

/** Payload sent by recruiter to update an existing problem */
export interface UpdateProblemPayload {
  roomId: string;
  title?: string;
  description?: string;
  examples?: string;
  constraints?: string;
}

/** Payload sent by anyone to request the current problem */
export interface GetProblemPayload {
  roomId: string;
}

/** Payload sent by recruiter to delete the current problem */
export interface DeleteProblemPayload {
  roomId: string;
}

// ── Broadcast payloads ─────────────────────────────────────────────────

/** The problem state broadcast to all room members */
export interface ProblemSyncData {
  roomId: string;
  problem: {
    title: string;
    description: string;
    examples?: string;
    constraints?: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  updatedAt: Date;
}

// ── Socket error ───────────────────────────────────────────────────────

export interface SocketErrorResponse {
  success: false;
  message: string;
  code?: string;
}
