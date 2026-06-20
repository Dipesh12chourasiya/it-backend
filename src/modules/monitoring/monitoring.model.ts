import mongoose, { Schema, Document } from "mongoose";

export interface IMonitoringEvent extends Document {
  interviewId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  eventType: "TAB_SWITCH" | "WINDOW_BLUR" | "COPY" | "PASTE" | "FULLSCREEN_EXIT" | "DEVTOOLS_OPEN";
  timestamp: Date;
}

const monitoringEventSchema = new Schema<IMonitoringEvent>(
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
    eventType: {
      type: String,
      enum: ["TAB_SWITCH", "WINDOW_BLUR", "COPY", "PASTE", "FULLSCREEN_EXIT", "DEVTOOLS_OPEN"],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying of events by interview and candidate
monitoringEventSchema.index({ interviewId: 1, candidateId: 1 });

export default mongoose.model<IMonitoringEvent>("MonitoringEvent", monitoringEventSchema);
