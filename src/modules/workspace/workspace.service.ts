import Workspace, { IWorkspace } from "./workspace.model";
import { AppError } from "../../utils/errors";

/**
 * Get or create workspace for an interview
 */
export const getOrCreateWorkspace = async (
  interviewId: string
): Promise<IWorkspace> => {
  let workspace = await Workspace.findOne({ interviewId });

  if (!workspace) {
    workspace = await Workspace.create({
      interviewId,
      language: "javascript",
      code: "",
      whiteboardData: {},
    });
  }

  return workspace;
};

/**
 * Get workspace for an interview
 */
export const getWorkspace = async (
  interviewId: string
): Promise<IWorkspace> => {
  const workspace = await Workspace.findOne({ interviewId });

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  return workspace;
};

/**
 * Update workspace content (partial updates)
 */
export const updateWorkspace = async (
  interviewId: string,
  data: {
    language?: string;
    code?: string;
    whiteboardData?: Record<string, any>;
  }
): Promise<IWorkspace> => {
  const workspace = await Workspace.findOne({ interviewId });

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  if (data.language !== undefined) workspace.language = data.language;
  if (data.code !== undefined) workspace.code = data.code;
  if (data.whiteboardData !== undefined)
    workspace.whiteboardData = data.whiteboardData;

  await workspace.save();
  return workspace;
};

/**
 * Update code only (for real-time sync)
 */
export const updateCode = async (
  interviewId: string,
  code: string,
  language: string
): Promise<void> => {
  await Workspace.findOneAndUpdate(
    { interviewId },
    { code, language },
    { upsert: true, new: true }
  );
};

/**
 * Update whiteboard only (for real-time sync)
 */
export const updateWhiteboard = async (
  interviewId: string,
  whiteboardData: Record<string, any>
): Promise<void> => {
  await Workspace.findOneAndUpdate(
    { interviewId },
    { whiteboardData },
    { upsert: true, new: true }
  );
};
