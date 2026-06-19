import jwt from "jsonwebtoken";
import User from "../modules/auth/auth.model";

export const protect = async (
  req: any,
  res: any,
  next: any
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as any;

    req.user = await User.findById(decoded.id);

    next();
  } catch {
    res.status(401).json({
      message: "Invalid token",
    });
  }
};