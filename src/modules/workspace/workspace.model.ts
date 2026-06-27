import mongoose, { Schema, Document } from "mongoose";

export interface IWorkspace extends Document {
  interviewId: mongoose.Types.ObjectId;
  language: string;
  code: string;
  whiteboardData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      unique: true,
    },
    language: {
      type: String,
      default: "javascript",
      enum: ["javascript", "typescript", "python", "java", "cpp" , "sql"],
    },
    code: {
      type: String,
      default: "",
    },
    whiteboardData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IWorkspace>("Workspace", workspaceSchema);
