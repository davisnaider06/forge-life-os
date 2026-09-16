import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FORGE — Life OS',
    short_name: 'FORGE',
    description: 'Seu progresso, todos os dias.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#080c0d',
    theme_color: '#080c0d',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Metas', url: '/metas' },
      { name: 'Finanças', url: '/financas' },
    ],
  };
}
