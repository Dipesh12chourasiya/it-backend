import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  interviewId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date;
  status: "waiting" | "active" | "completed" | "left";
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    leftAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "completed", "left"],
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly check active sessions for a candidate per interview
sessionSchema.index({ interviewId: 1, candidateId: 1, status: 1 });

export default mongoose.model<ISession>("Session", sessionSchema);
