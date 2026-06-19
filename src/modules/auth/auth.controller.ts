import { Request, Response } from "express";

import {
  registerUser,
  loginUser,
} from "./auth.service";

export const register = async (
  req: Request,
  res: Response
) => {
  const result = await registerUser(
    req.body.name,
    req.body.email,
    req.body.password,
    req.body.role
  );

  res.status(201).json(result);
};

export const login = async (
  req: Request,
  res: Response
) => {
  const result = await loginUser(
    req.body.email,
    req.body.password
  );

  res.status(200).json(result);
};