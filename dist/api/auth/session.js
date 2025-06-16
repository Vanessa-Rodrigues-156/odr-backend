"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sessionHandler;
async function sessionHandler(req, res) {
    console.log("Session check requested");
    if (!req.user) {
        console.log("Session check failed: No authenticated user");
        return res.status(401).json({
            authenticated: false,
            error: "Not authenticated"
        });
    }
    // Format user data for consistent response
    // Only include base user properties, role-specific properties should be added by the middleware
    const user = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        userRole: req.user.userRole,
        contactNumber: req.user.contactNumber,
        city: req.user.city,
        country: req.user.country,
        createdAt: req.user.createdAt,
        // Include role-specific properties that may have been attached by the middleware
        ...(req.user.institution !== undefined && { institution: req.user.institution }),
        ...(req.user.highestEducation !== undefined && { highestEducation: req.user.highestEducation }),
        ...(req.user.courseName !== undefined && { courseName: req.user.courseName }),
        ...(req.user.courseStatus !== undefined && { courseStatus: req.user.courseStatus }),
        ...(req.user.mentorType !== undefined && { mentorType: req.user.mentorType }),
        ...(req.user.organization !== undefined && { organization: req.user.organization }),
        ...(req.user.role !== undefined && { role: req.user.role }),
        ...(req.user.expertise !== undefined && { expertise: req.user.expertise }),
        ...(req.user.course !== undefined && { course: req.user.course }),
        ...(req.user.mentoring !== undefined && { mentoring: req.user.mentoring }),
        ...(req.user.workplace !== undefined && { workplace: req.user.workplace }),
        ...(req.user.description !== undefined && { description: req.user.description }),
    };
    // Remove the odrLabUsage field as it doesn't exist in the schema anymore
    // user.odrLabUsage = req.user.odrLabUsage;
    // Log successful session check
    console.log(`Session valid for user: ${user.email} with role: ${user.userRole}`);
    // Return session data
    return res.status(200).json({
        authenticated: true,
        user,
        // If we have jwt payload with expiration, include time remaining
        ...(req.jwtPayload?.exp ? {
            expiresAt: new Date(req.jwtPayload.exp * 1000).toISOString(),
            expiresIn: req.jwtPayload.exp - Math.floor(Date.now() / 1000)
        } : {})
    });
}
