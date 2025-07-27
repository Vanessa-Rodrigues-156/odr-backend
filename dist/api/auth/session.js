"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sessionHandler;
async function sessionHandler(req, res) {
    console.log("Session check requested");
    if (!req.user) {
        console.log("Session check failed: No authenticated user");
        const response = {
            authenticated: false,
            error: "Not authenticated"
        };
        return res.status(401).json(response);
    }
    // Format user data for consistent response - req.user is already properly typed
    const user = req.user;
    // Log successful session check
    console.log(`Session valid for user: ${user.email} with role: ${user.userRole}`);
    // Calculate if profile completion is needed based on role and available data
    let needsProfileCompletion = false;
    if (user.userRole === "INNOVATOR") {
        needsProfileCompletion = !user.institution || !user.highestEducation;
    }
    else if (user.userRole === "MENTOR") {
        needsProfileCompletion = !user.mentorType || !user.organization;
    }
    else if (user.userRole === "FACULTY") {
        needsProfileCompletion = !user.institution || !user.course;
    }
    else if (user.userRole === "OTHER") {
        needsProfileCompletion = !user.workplace || !user.role;
    }
    // Return session data with unified structure
    const response = {
        authenticated: true,
        user,
        needsProfileCompletion,
        // If we have jwt payload with expiration, include time remaining
        ...(req.jwtPayload?.exp ? {
            expiresAt: new Date(req.jwtPayload.exp * 1000).toISOString(),
            expiresIn: req.jwtPayload.exp - Math.floor(Date.now() / 1000)
        } : {})
    };
    return res.status(200).json(response);
}
