import { Request, Response, NextFunction } from "express";
import { logEventSchema } from "./monitoring.validation";
import { createEvent, getEventsForInterview } from "./monitoring.service";
import { emitMonitoringEvent } from "../../socket/socket.server";

/**
 * POST /api/v1/monitoring/event
 * Log a candidate behaviour event
 */
export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = logEventSchema.parse(req.body);
    const event = await createEvent(
      validated.interviewId,
      validated.candidateId,
      validated.eventType
    );

    // Broadcast to recruiters in real-time via Socket.IO
    emitMonitoringEvent(validated.interviewId, event);

    res.status(201).json({
      success: true,
      message: "Monitoring event logged",
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/monitoring/events/:interviewId
 * Fetch all monitoring events for an interview
 */
export const getByInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const events = await getEventsForInterview(req.params.interviewId as string);
    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (err) {
    next(err);
  }
};
