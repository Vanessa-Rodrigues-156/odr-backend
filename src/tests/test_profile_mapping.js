// Test script to validate our profile field mappings
console.log("=== PROFILE FIELD MAPPING VALIDATION ===\n");

// Define the schema structure
const schemaFields = {
  User: ['id', 'name', 'email', 'password', 'contactNumber', 'city', 'country', 'userRole', 'imageAvatar', 'createdAt', 'updatedAt'],
  Innovator: ['id', 'userId', 'institution', 'highestEducation', 'courseName', 'courseStatus', 'description'],
  Mentor: ['id', 'userId', 'mentorType', 'organization', 'role', 'expertise', 'description', 'approved', 'reviewedAt', 'reviewedBy', 'rejectionReason'],
  Faculty: ['id', 'userId', 'institution', 'role', 'expertise', 'course', 'mentoring', 'description'],
  Other: ['id', 'userId', 'role', 'workplace', 'description']
};

// Define frontend fields we're sending
const frontendFields = {
  baseUser: ['name', 'imageAvatar', 'contactNumber', 'country', 'city'],
  roleSpecific: {
    INNOVATOR: ['institution', 'highestEducation', 'courseName', 'courseStatus', 'description'],
    MENTOR: ['organization', 'role', 'expertise', 'description'], 
    FACULTY: ['institution', 'role', 'expertise', 'course', 'mentoring', 'description'],
    OTHER: ['workplace', 'role', 'description']
  }
};

console.log("Schema validation:");
console.log("✓ User table fields:", schemaFields.User);
console.log("✓ Innovator table fields:", schemaFields.Innovator);
console.log("✓ Mentor table fields:", schemaFields.Mentor);
console.log("✓ Faculty table fields:", schemaFields.Faculty);
console.log("✓ Other table fields:", schemaFields.Other);

console.log("\nFrontend mapping validation:");
console.log("✓ Base user fields we're updating:", frontendFields.baseUser);

Object.keys(frontendFields.roleSpecific).forEach(role => {
  console.log(`✓ ${role} specific fields:`, frontendFields.roleSpecific[role]);
  
  // Validate that all frontend fields exist in the corresponding schema table
  const tableName = role.charAt(0) + role.slice(1).toLowerCase();
  const schemaTableFields = schemaFields[tableName];
  const frontendRoleFields = frontendFields.roleSpecific[role];
  
  const invalidFields = frontendRoleFields.filter(field => !schemaTableFields.includes(field));
  if (invalidFields.length > 0) {
    console.log(`  ⚠️ Invalid fields for ${role}:`, invalidFields);
  } else {
    console.log(`  ✓ All ${role} fields are valid`);
  }
});

console.log("\n=== VALIDATION COMPLETE ===");
