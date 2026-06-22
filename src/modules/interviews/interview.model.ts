import mongoose, { Schema, Document } from "mongoose";

// ── Problem subdocument ───────────────────────────────────────────────
export interface IProblem {
  title: string;
  description: string;
  examples?: string;
  constraints?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Interview document ────────────────────────────────────────────────
export interface IInterview extends Document {
  title: string;
  description: string;
  recruiterId: mongoose.Types.ObjectId;
  interviewCode: string;
  startTime: Date;
  endTime: Date;
  status: "scheduled" | "active" | "completed";
  currentProblem?: IProblem;
  createdAt: Date;
  updatedAt: Date;
}

const interviewSchema = new Schema<IInterview>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    interviewCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed"],
      default: "scheduled",
    },
    currentProblem: {
      title: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      examples: {
        type: String,
        trim: true,
      },
      constraints: {
        type: String,
        trim: true,
      },
      version: {
        type: Number,
        default: 1,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IInterview>("Interview", interviewSchema);
