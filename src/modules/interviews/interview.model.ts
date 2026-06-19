import mongoose, { Schema, Document } from "mongoose";

export interface IInterview extends Document {
  title: string;
  description: string;
  recruiterId: mongoose.Types.ObjectId;
  interviewCode: string;
  startTime: Date;
  endTime: Date;
  status: "scheduled" | "active" | "completed";
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IInterview>("Interview", interviewSchema);
