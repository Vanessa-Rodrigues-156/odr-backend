"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const prisma = new client_1.PrismaClient();
/**
 * This script imports user data from the AWS RDS backup SQL file
 * and migrates it to the new schema structure with separate tables.
 */
async function importBackupData() {
    try {
        console.log("Starting data import from backup...");
        const backupFile = path.join(__dirname, '../../aws_rds_backup.sql');
        if (!fs.existsSync(backupFile)) {
            console.error(`Backup file not found: ${backupFile}`);
            return;
        }
        // Extract user data from the SQL backup
        const users = await extractUsersFromBackup(backupFile);
        console.log(`Found ${users.length} users in the backup`);
        // Migrate each user
        for (const user of users) {
            console.log(`Migrating user: ${user.email}`);
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
                // Create or update user record
                await prisma.user.upsert({
                    where: { id: user.id },
                    update: {
                        name: user.name,
                        email: user.email,
                        password: user.password,
                        contactNumber: user.contactNumber,
                        city: user.city,
                        country: user.country,
                        userRole: user.userRole,
                        imageAvatar: user.imageAvatar,
                        createdAt: user.createdAt,
                        updatedAt: new Date()
                    },
                    create: {
                        id: user.id, // Preserve the original ID
                        name: user.name,
                        email: user.email,
                        password: user.password,
                        contactNumber: user.contactNumber,
                        city: user.city,
                        country: user.country,
                        userRole: user.userRole,
                        imageAvatar: user.imageAvatar,
                        createdAt: user.createdAt,
                        updatedAt: new Date()
                    }
                });
                // Based on user role, create appropriate type record
                switch (user.userRole) {
                    case "INNOVATOR":
                        await prisma.innovator.upsert({
                            where: { userId: user.id },
                            update: {
                                institution: user.institution || metadata?.student?.institute || null,
                                highestEducation: user.highestEducation || null,
                                courseName: metadata?.student?.courseName || null,
                                courseStatus: metadata?.student?.courseStatus || null,
                                description: metadata?.description || user.odrLabUsage || null
                            },
                            create: {
                                userId: user.id,
                                institution: user.institution || metadata?.student?.institute || null,
                                highestEducation: user.highestEducation || null,
                                courseName: metadata?.student?.courseName || null,
                                courseStatus: metadata?.student?.courseStatus || null,
                                description: metadata?.description || user.odrLabUsage || null
                            }
                        });
                        break;
                    case "MENTOR":
                        // Determine mentor type from metadata
                        let mentorType = "TECHNICAL_EXPERT"; // Default
                        if (metadata?.law) {
                            mentorType = "LEGAL_EXPERT";
                        }
                        else if (metadata?.odr) {
                            mentorType = "ODR_EXPERT";
                        }
                        else if (metadata?.conflict) {
                            mentorType = "CONFLICT_RESOLUTION_EXPERT";
                        }
                        // Determine organization and role based on mentor type
                        let organization = user.institution || "";
                        let role = "";
                        let expertise = "";
                        if (mentorType === "TECHNICAL_EXPERT" && metadata?.tech) {
                            organization = metadata.tech.organization || organization;
                            role = metadata.tech.role || "";
                        }
                        else if (mentorType === "LEGAL_EXPERT" && metadata?.law) {
                            organization = metadata.law.firm || organization;
                        }
                        else if (mentorType === "ODR_EXPERT" && metadata?.odr) {
                            expertise = metadata.odr.expertise || "ODR Expert";
                            organization = metadata.odr.workplace || organization;
                        }
                        else if (mentorType === "CONFLICT_RESOLUTION_EXPERT" && metadata?.conflict) {
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
                                description: metadata?.description || user.odrLabUsage || null
                            },
                            create: {
                                userId: user.id,
                                mentorType,
                                organization,
                                role,
                                expertise,
                                description: metadata?.description || user.odrLabUsage || null
                            }
                        });
                        break;
                    case "FACULTY":
                        await prisma.faculty.upsert({
                            where: { userId: user.id },
                            update: {
                                institution: metadata?.faculty?.institute || user.institution || null,
                                role: metadata?.faculty?.role || null,
                                expertise: metadata?.faculty?.expertise || null,
                                course: metadata?.faculty?.course || null,
                                mentoring: metadata?.faculty?.mentoring === "yes" || false,
                                description: metadata?.description || user.odrLabUsage || null
                            },
                            create: {
                                userId: user.id,
                                institution: metadata?.faculty?.institute || user.institution || null,
                                role: metadata?.faculty?.role || null,
                                expertise: metadata?.faculty?.expertise || null,
                                course: metadata?.faculty?.course || null,
                                mentoring: metadata?.faculty?.mentoring === "yes" || false,
                                description: metadata?.description || user.odrLabUsage || null
                            }
                        });
                        break;
                    default: // OTHER or any unhandled case
                        await prisma.other.upsert({
                            where: { userId: user.id },
                            update: {
                                role: metadata?.other?.role || null,
                                workplace: metadata?.other?.workplace || user.institution || null,
                                description: metadata?.description || user.odrLabUsage || null
                            },
                            create: {
                                userId: user.id,
                                role: metadata?.other?.role || null,
                                workplace: metadata?.other?.workplace || user.institution || null,
                                description: metadata?.description || user.odrLabUsage || null
                            }
                        });
                        break;
                }
                console.log(`Successfully migrated user: ${user.email}`);
            }
            catch (error) {
                console.error(`Error migrating user ${user.email}:`, error);
            }
        }
        console.log("\nData import and migration complete!");
    }
    catch (error) {
        console.error("Error in import process:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
/**
 * Extract user data from SQL backup file
 */
async function extractUsersFromBackup(filePath) {
    console.log(`Extracting user data from backup: ${filePath}`);
    const users = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    let inUserDataSection = false;
    for await (const line of rl) {
        // Check if we're entering the User data section
        if (line.includes('COPY public."User"')) {
            console.log('Found User table data section');
            inUserDataSection = true;
            continue;
        }
        // Check if we're leaving the User data section
        if (inUserDataSection && line === '\\.' || line.startsWith('--') && inUserDataSection) {
            inUserDataSection = false;
            continue;
        }
        // Process user data lines
        if (inUserDataSection && line.trim().length > 0) {
            try {
                // Parse the SQL data line
                const fields = parseSQLDataLine(line);
                // Parse date properly
                let createdAt = new Date();
                if (fields[12]) {
                    try {
                        // Try to parse the date in different formats
                        if (typeof fields[12] === 'string') {
                            // Format: YYYY-MM-DD HH:MM:SS.SSS
                            if (fields[12].match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/)) {
                                createdAt = new Date(fields[12].replace(' ', 'T') + 'Z');
                            }
                            // Format: YYYY-MM-DD HH:MM:SS
                            else if (fields[12].match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                                createdAt = new Date(fields[12].replace(' ', 'T') + '.000Z');
                            }
                            else {
                                // Default to current date if format is unrecognized
                                console.log(`Unrecognized date format for user ${fields[2]}: ${fields[12]}`);
                                createdAt = new Date();
                            }
                        }
                    }
                    catch (error) {
                        console.log(`Error parsing date for user ${fields[2]}: ${error}`);
                        createdAt = new Date();
                    }
                }
                // Create user object from parsed fields
                const user = {
                    id: fields[0] || '',
                    name: fields[1] || '',
                    email: fields[2] || '',
                    password: fields[3] || '',
                    contactNumber: fields[4],
                    city: fields[5],
                    country: fields[6],
                    userRole: fields[7] || 'INNOVATOR',
                    institution: fields[8],
                    highestEducation: fields[9],
                    odrLabUsage: fields[10],
                    imageAvatar: fields[11],
                    createdAt: createdAt
                };
                users.push(user);
            }
            catch (err) {
                console.warn(`Failed to parse user data line: ${line}`, err);
            }
        }
    }
    return users;
}
/**
 * Parse a line of SQL data into an array of fields
 */
function parseSQLDataLine(line) {
    const fields = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < line.length) {
        if (line[i] === '\\' && i + 1 < line.length) {
            // Handle escape characters
            i++;
            field += line[i];
        }
        else if (line[i] === '"' && !inQuotes) {
            // Start of quoted field
            inQuotes = true;
        }
        else if (line[i] === '"' && inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            // Escaped quote inside quotes
            field += '"';
            i++;
        }
        else if (line[i] === '"' && inQuotes) {
            // End of quoted field
            inQuotes = false;
        }
        else if (line[i] === '\t' && !inQuotes) {
            // Tab separator
            fields.push(field === '\\N' ? null : field);
            field = '';
        }
        else {
            field += line[i];
        }
        i++;
    }
    // Add the last field
    fields.push(field === '\\N' ? null : field);
    return fields;
}
// Run the script
importBackupData().catch(console.error);
