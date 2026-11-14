import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@jarvis/core',
    '@jarvis/database',
    '@jarvis/shared-contracts',
    '@jarvis/permission-engine',
    '@jarvis/budget-manager',
    '@jarvis/agent-orchestrator',
    '@jarvis/telegram-integration',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
