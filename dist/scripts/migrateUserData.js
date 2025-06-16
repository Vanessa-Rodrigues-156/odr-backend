"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * This script migrates user data from the old schema to the new schema.
 * It should be run BEFORE applying the new schema migration to access legacy fields.
 */
async function migrateUserData() {
    try {
        console.log("Starting user data migration...");
        const fs = require('fs');
        const path = require('path');
        // File to store legacy data
        const dataFile = path.join(__dirname, '../..', 'legacy_user_data.json');
        let users = [];
        // Check if we already have extracted data
        if (fs.existsSync(dataFile)) {
            console.log("Found cached legacy data. Using it for migration...");
            const jsonData = fs.readFileSync(dataFile, 'utf8');
            users = JSON.parse(jsonData);
        }
        else {
            try {
                console.log("Fetching all users from database...");
                // Get all users with a direct query to access legacy fields
                // that will no longer exist in the new schema
                users = await prisma.$queryRaw `
          SELECT id, name, email, password, "contactNumber", city, country, 
                 "userRole", institution, "highestEducation", "odrLabUsage", 
                 "createdAt"
          FROM "User"
        `;
                console.log(`Successfully fetched ${users.length} users`);
            }
            catch (error) {
                console.error("Error fetching users:", error);
                console.log("\nTrying fallback query with fewer columns...");
                // Fallback to a simpler query if the first one fails
                users = await prisma.$queryRaw `
          SELECT id, name, email, password, "userRole", "createdAt"
          FROM "User"
        `;
            }
            // Convert Date objects to strings for JSON storage
            const usersForJson = users.map(user => ({
                ...user,
                createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
                updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : undefined
            }));
            // Save the data for potential future use
            fs.writeFileSync(dataFile, JSON.stringify(usersForJson, null, 2));
        }
        console.log(`Found ${users.length} users to migrate`);
        console.log("Legacy user data backed up to legacy_user_data.json");
        for (const user of users) {
            console.log(`Migrating data for user: ${user.name} (${user.email})`);
            try {
                // Parse metadata from odrLabUsage if available
                let metadata = {};
                if (user.odrLabUsage && typeof user.odrLabUsage === 'string' && user.odrLabUsage.includes("METADATA:")) {
                    const metadataString = user.odrLabUsage.split("METADATA:")[1];
                    try {
                        metadata = JSON.parse(metadataString);
                    }
                    catch (err) {
                        console.log(`Failed to parse metadata for user ${user.id}`);
                    }
                }
                // Based on user role, create appropriate type record
                switch (user.userRole) {
                    case "INNOVATOR":
                        await prisma.innovator.upsert({
                            where: { userId: user.id },
                            update: {
                                institution: user.institution || metadata.student?.institute || null,
                                highestEducation: user.highestEducation || null,
                                courseName: metadata.student?.courseName || null,
                                courseStatus: metadata.student?.courseStatus || null,
                                description: metadata.description || null
                            },
                            create: {
                                userId: user.id,
                                institution: user.institution || metadata.student?.institute || null,
                                highestEducation: user.highestEducation || null,
                                courseName: metadata.student?.courseName || null,
                                courseStatus: metadata.student?.courseStatus || null,
                                description: metadata.description || null
                            }
                        });
                        break;
                    case "MENTOR":
                        // Determine mentor type from metadata
                        let mentorType = "TECHNICAL_EXPERT"; // Default
                        if (metadata.law) {
                            mentorType = "LEGAL_EXPERT";
                        }
                        else if (metadata.odr) {
                            mentorType = "ODR_EXPERT";
                        }
                        else if (metadata.conflict) {
                            mentorType = "CONFLICT_RESOLUTION_EXPERT";
                        }
                        // Determine organization and role based on mentor type
                        let organization = user.institution || "";
                        let role = "";
                        let expertise = "";
                        if (mentorType === "TECHNICAL_EXPERT" && metadata.tech) {
                            organization = metadata.tech.organization || organization;
                            role = metadata.tech.role || "";
                        }
                        else if (mentorType === "LEGAL_EXPERT" && metadata.law) {
                            organization = metadata.law.firm || organization;
                        }
                        else if (mentorType === "ODR_EXPERT" && metadata.odr) {
                            expertise = metadata.odr.expertise || "ODR Expert";
                            organization = metadata.odr.workplace || organization;
                        }
                        else if (mentorType === "CONFLICT_RESOLUTION_EXPERT" && metadata.conflict) {
                            expertise = metadata.conflict.expertise || "Conflict Resolution Expert";
                            organization = metadata.conflict.workplace || organization;
                        }
                        await prisma.mentor.upsert({
                            where: { userId: user.id },
                            update: {
                                mentorType,
                                organization,
                                role,
                                expertise,
                                description: metadata.description || null
                            },
                            create: {
                                userId: user.id,
                                mentorType,
                                organization,
                                role,
                                expertise,
                                description: metadata.description || null
                            }
                        });
                        break;
                    case "FACULTY":
                    case "OTHER":
                        if (metadata.faculty) {
                            await prisma.faculty.upsert({
                                where: { userId: user.id },
                                update: {
                                    institution: metadata.faculty.institute || user.institution || null,
                                    role: metadata.faculty.role || null,
                                    expertise: metadata.faculty.expertise || null,
                                    course: metadata.faculty.course || null,
                                    mentoring: metadata.faculty.mentoring === "yes" || false,
                                    description: metadata.description || null
                                },
                                create: {
                                    userId: user.id,
                                    institution: metadata.faculty.institute || user.institution || null,
                                    role: metadata.faculty.role || null,
                                    expertise: metadata.faculty.expertise || null,
                                    course: metadata.faculty.course || null,
                                    mentoring: metadata.faculty.mentoring === "yes" || false,
                                    description: metadata.description || null
                                }
                            });
                            // Update user role to FACULTY
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { userRole: "FACULTY" }
                            });
                        }
                        else {
                            await prisma.other.upsert({
                                where: { userId: user.id },
                                update: {
                                    role: metadata.other?.role || null,
                                    workplace: metadata.other?.workplace || user.institution || null,
                                    description: metadata.description || null
                                },
                                create: {
                                    userId: user.id,
                                    role: metadata.other?.role || null,
                                    workplace: metadata.other?.workplace || user.institution || null,
                                    description: metadata.description || null
                                }
                            });
                        }
                        break;
                    default:
                        // For any other roles or cases we didn't handle
                        await prisma.other.upsert({
                            where: { userId: user.id },
                            update: {
                                workplace: user.institution || null,
                                description: user.odrLabUsage || null
                            },
                            create: {
                                userId: user.id,
                                workplace: user.institution || null,
                                description: user.odrLabUsage || null
                            }
                        });
                        break;
                }
                console.log(`Successfully migrated user: ${user.name}`);
            }
            catch (error) {
                console.error(`Error migrating user ${user.name} (${user.id}):`, error);
            }
        }
        console.log("\nMigration complete!");
        console.log("\nIMPORTANT: This script has prepared data for the new schema.");
        console.log("You can now apply the new schema with 'npx prisma migrate dev'.");
        console.log("After applying the new schema, verify the migration with 'npm run verify:migration'.");
    }
    catch (error) {
        console.error("Error in migration process:", error);
        console.error("You may need to restore from backup before retrying the migration.");
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the migration
migrateUserData().catch(console.error);
