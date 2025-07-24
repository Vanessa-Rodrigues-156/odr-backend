import { Request, Response } from "express";
import { clearAuthCookies } from "../../lib/auth-utils";

export default async function logoutHandler(req: Request, res: Response) {
  try {
    // Clear all authentication cookies using the robust utility
    clearAuthCookies(res);
    
    console.log("User logout successful - all auth cookies cleared");
    
    return res.status(200).json({ 
      success: true, 
      message: "Logout successful" 
    });
  } catch (error) {
    console.error("Error during logout:", error);
    
    // Even if there's an error, try to clear cookies manually as fallback
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
    res.clearCookie("odrindia_session", { path: "/" });
    
    return res.status(500).json({ 
      success: false, 
      error: "Logout failed, but cookies cleared" 
    });
  }
}
