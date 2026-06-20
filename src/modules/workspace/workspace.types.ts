export interface IWorkspace {
  interviewId: string;
  language: string;
  code: string;
  whiteboardData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceUpdatePayload {
  language?: string;
  code?: string;
  whiteboardData?: Record<string, any>;
}

export interface CodeChangePayload {
  interviewId: string;
  language: string;
  code: string;
}

export interface WhiteboardChangePayload {
  interviewId: string;
  whiteboardData: Record<string, any>;
}
