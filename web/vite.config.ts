import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const pinoShim = path.join(webRoot, 'shims/pino.ts');

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Vercel serves the Nitro build output. Local dev keeps the Cloudflare plugin.
  const onVercel = process.env.VERCEL === '1';
  const serverPlugin = onVercel
    ? (await import('nitro/vite')).nitro()
    : (
        await import('@cloudflare/vite-plugin')
      ).cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      });

  const tailwind = tailwindcss();

  return {
    resolve: {
      alias: [
        { find: /^pino$/, replacement: pinoShim },
        { find: /^pino\/browser(\.js)?$/, replacement: pinoShim },
        ...(onVercel
          ? [
              {
                find: 'tailwindcss',
                replacement: path.join(webRoot, 'node_modules/tailwindcss/index.css'),
              },
              {
                find: 'tw-animate-css',
                replacement: path.join(
                  webRoot,
                  'node_modules/tw-animate-css/dist/tw-animate.css',
                ),
              },
              {
                find: 'shadcn/tailwind.css',
                replacement: path.join(webRoot, 'node_modules/shadcn/dist/tailwind.css'),
              },
            ]
          : []),
      ],
    },
    css: { postcss: { plugins: [tailwind] } },
    server: {
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
      proxy: {
        '/api/mobile/sui/resolve-name': { target: 'https://unsui.ca', changeOrigin: true },
        '/api/mobile/ens/resolve-name': { target: 'https://unsui.ca', changeOrigin: true },
        '/api/auth': {
          target: 'http://127.0.0.1:4100',
          rewrite: (path: string) => path.replace(/^\/api\/auth/, '/auth'),
        },
        '/api/operations': {
          target: 'http://127.0.0.1:4100',
          rewrite: (path: string) => path.replace(/^\/api\/operations/, '/operations'),
        },
      },
    },
    plugins: [
      vinext(),
      sites(),
      serverPlugin,
      ...(onVercel
        ? [
            {
              name: 'unsui-tailwind',
              configEnvironment() {
                return { css: { postcss: { plugins: [tailwind] } } };
              },
            },
          ]
        : []),
    ],
  };
});
