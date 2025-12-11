import { loadEnvConfig } from '@next/env';

// Load environment variables from .env files
// This must be executed before any other imports that use process.env
loadEnvConfig(process.cwd());
