import { PrismaClient, UserRole } from "@prisma/client";
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Define interface for legacy user data
interface LegacyUser {
  id: string;
  name: string;
  email: string;
  password: string | null;
  contactNumber: string | null;
  city: string | null;
  country: string | null;
  userRole: UserRole;
  institution?: string | null;
  highestEducation?: string | null;
  odrLabUsage?: string | null;
  imageAvatar?: string | null; // Made optional since it might not exist
  createdAt: string; // ISO date string when read from JSON
  updatedAt?: string; // ISO date string when read from JSON
}

/**
 * This script verifies the user data migration by checking that all users have
 * appropriate entries in their type-specific tables.
 */
async function verifyMigration() {
  try {
    console.log("Starting migration verification...");
    
    // Check for legacy data
    const dataFile = path.join(__dirname, '../..', 'legacy_user_data.json');
    let legacyUsers: LegacyUser[] = [];
    
    if (fs.existsSync(dataFile)) {
      console.log("Found legacy data file for detailed comparison...");
      const jsonData = fs.readFileSync(dataFile, 'utf8');
      legacyUsers = JSON.parse(jsonData);
    } else {
      console.log("Legacy data file not found. Will perform basic verification only.");
    }
    
    // Get counts of all entities
    const userCount = await prisma.user.count();
    const innovatorCount = await prisma.innovator.count();
    const mentorCount = await prisma.mentor.count();
    const facultyCount = await prisma.faculty.count();
    const otherCount = await prisma.other.count();
    
    console.log("Entity counts:");
    console.log(`- Users: ${userCount}`);
    console.log(`- Innovators: ${innovatorCount}`);
    console.log(`- Mentors: ${mentorCount}`);
    console.log(`- Faculty: ${facultyCount}`);
    console.log(`- Other: ${otherCount}`);
    
    // The total of all type-specific entries should equal the user count
    const totalTypeEntries = innovatorCount + mentorCount + facultyCount + otherCount;
    
    if (totalTypeEntries === userCount) {
      console.log("\n✅ SUCCESS: All users have been migrated to their type-specific tables.");
    } else {
      console.log(`\n❌ ISSUE: Missing type entries. User count: ${userCount}, type entries: ${totalTypeEntries}`);
      
      // Find users without corresponding type entries
      const usersWithoutType = await findUsersWithoutTypeEntries();
      
      if (usersWithoutType.length > 0) {
        console.log(`Found ${usersWithoutType.length} users without type entries:`);
        usersWithoutType.forEach(user => {
          console.log(`- ${user.name} (${user.email}) - Role: ${user.userRole}, ID: ${user.id}`);
        });
        
        // If we have legacy data, check what might be missing
        if (legacyUsers.length > 0) {
          for (const user of usersWithoutType) {
            const legacyUser = legacyUsers.find(lu => lu.id === user.id);
            if (legacyUser) {
              console.log(`Legacy data for ${user.name}:`);
              console.log(`  Role: ${legacyUser.userRole}`);
              console.log(`  Institution: ${legacyUser.institution || 'none'}`);
              console.log(`  HighestEducation: ${legacyUser.highestEducation || 'none'}`);
              console.log(`  Has metadata: ${legacyUser.odrLabUsage?.includes('METADATA:') ? 'yes' : 'no'}`);
            }
          }
        }
      }
    }
    
    // Check mentor types distribution
    const mentorTypes = await prisma.mentor.groupBy({
      by: ['mentorType'],
      _count: true
    });
    
    console.log("\nMentor type distribution:");
    mentorTypes.forEach(type => {
      console.log(`- ${type.mentorType}: ${type._count} mentors`);
    });
    
  } catch (error) {
    console.error("Error during verification:", error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Helper function to find users without corresponding type entries
 */
async function findUsersWithoutTypeEntries() {
  const users = await prisma.user.findMany({
    include: {
      innovator: true,
      mentor: true,
      faculty: true,
      other: true
    }
  });
  
  return users.filter(user => 
    !user.innovator && !user.mentor && !user.faculty && !user.other
  );
}

// Run the verification
verifyMigration().catch(console.error);
