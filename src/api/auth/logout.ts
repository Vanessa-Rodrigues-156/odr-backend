import { Request, Response } from "express";

export default async function logoutHandler(req: Request, res: Response) {
  // Clear auth cookies
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
  res.json({ success: true });
}
