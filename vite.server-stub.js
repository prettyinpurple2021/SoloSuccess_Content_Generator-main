// Server-only module stub for client builds
// This file is used to stub out server-only modules that shouldn't be bundled for the browser
// API routes run server-side and will use the real packages from node_modules

const error = () => {
  throw new Error(
    'This is a server-only module and cannot be used in client-side code. Please use API endpoints instead.'
  );
};

// Default export
export default error;

// Named exports for postgres
export const sql = error;

// Named exports for Redis
export const Redis = error;

// RedisService class stub
export class RedisService {
  constructor() {
    throw error();
  }
}
