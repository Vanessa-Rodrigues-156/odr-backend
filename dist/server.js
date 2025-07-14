"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Determine which environment file to load
const environment = process.env.NODE_ENV || 'production';
const envFile = environment === 'production' ? '.env.production' : '.env.development';
// Load the appropriate environment file
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), envFile) });
console.log(`Loading environment from: ${envFile}`);
console.log(`Environment: ${environment}`);
// Add environment validation
if (!process.env.TOGETHER_API_KEY) {
    console.error(`ERROR: TOGETHER_API_KEY environment variable is missing from ${envFile}!`);
    process.exit(1);
}
const app_1 = __importDefault(require("./app"));
const PORT = process.env.PORT || 4000;
app_1.default.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Environment: ${environment}`);
    console.log(`Together AI API Key loaded: ${process.env.TOGETHER_API_KEY ? 'Yes' : 'No'}`);
});
