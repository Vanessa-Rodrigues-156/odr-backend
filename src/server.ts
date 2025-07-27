import dotenv from "dotenv";
import path from "path";

// Determine which environment file to load
const environment = process.env.NODE_ENV || 'production';
const envFile = environment === 'production' ? '.env.production' : '.env.development';

// Load the appropriate environment file
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`Loading environment from: ${envFile}`);
console.log(`Environment: ${environment}`);

// Add environment validation
if (!process.env.TOGETHER_API_KEY) {
  console.error(`ERROR: TOGETHER_API_KEY environment variable is missing from ${envFile}!`);
  process.exit(1);
}

import app from "./app";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${environment}`);
  console.log(`Together AI API Key loaded: ${process.env.TOGETHER_API_KEY ? 'Yes' : 'No'}`);
});
