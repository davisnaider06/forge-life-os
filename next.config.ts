import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@anthropic-ai/claude-agent-sdk'],
  // O binário do Claude Code (~230 MB) não cabe numa função da Vercel; lá o agente roda
  // em agent-server/ e a rota apenas repassa a conversa.
  outputFileTracingExcludes: {
    '/*': ['./node_modules/@anthropic-ai/claude-agent-sdk-*/**/*'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};
export default config;
