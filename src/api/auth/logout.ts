import { Request, Response } from "express";

export default async function logoutHandler(req: Request, res: Response) {
  // If using cookies, clear the cookie here
  // res.clearCookie("token");
  res.json({ success: true });
}
