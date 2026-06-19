import bcrypt from "bcryptjs";
import User from "./auth.model";
import { generateToken } from "../../utils/jwt";

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  role: "recruiter" | "candidate"
) => {
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,

  });

  const token = generateToken(user._id.toString());

  return {
    user,
    token,
  };
};

export const loginUser = async (
  email: string,
  password: string
) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(
    password,
    user.password
  );

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken(user._id.toString());

  return {
    user,
    token,
  };
};