import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// Helper to get cookie options
function getCookieOptions(isRefresh = false) {
  return {
    httpOnly: true,
    secure: true, // Always set Secure for HTTPS
    sameSite: "none" as const, // Allow cross-origin cookies for production
    path: "/",
    ...(isRefresh ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : { maxAge: 15 * 60 * 1000 })
  };
}

export default async function refreshTokenHandler(req: Request, res: Response) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: "Server configuration error" });
  }
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing" });
  }
  try {
    const payload = jwt.verify(refreshToken, jwtSecret) as JwtPayload;
    // Issue new access token (15m) and refresh token (7d)
    const accessToken = jwt.sign(
      { id: payload.id, email: payload.email, userRole: payload.userRole },
      jwtSecret,
      { expiresIn: "15m" }
    );
    const newRefreshToken = jwt.sign(
      { id: payload.id, email: payload.email, userRole: payload.userRole },
      jwtSecret,
      { expiresIn: "7d" }
    );
    res.cookie("access_token", accessToken, getCookieOptions());
    res.cookie("refresh_token", newRefreshToken, getCookieOptions(true));
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}
