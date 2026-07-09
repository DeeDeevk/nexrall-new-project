import { handle } from './server.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      // Set default credentials for local development if not provided
      const mockEnv = {
        USER_ID: env.USER_ID || 'dev-user-123',
        OWNER_ID: env.OWNER_ID || 'dev-user-123',
        ...env
      };
      return handle(request, mockEnv);
    }
    return env.ASSETS.fetch(request);
  }
}
