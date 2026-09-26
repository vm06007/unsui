const fs = require('node:fs/promises');
const path = require('node:path');
const { build } = require('esbuild');

(async () => {
  require('./build.cjs');
  const output = path.resolve(__dirname, '../../web/.vercel/output');
  const directory = path.join(output, 'functions/mobile.func');
  await fs.mkdir(directory, { recursive: true });
  await build({
    entryPoints: [path.resolve(__dirname, '../hosted.cjs')],
    outfile: path.join(directory, 'index.cjs'),
    bundle: true, platform: 'node', target: 'node24', format: 'cjs',
    external: ['pg-native'],
  });
  await fs.writeFile(path.join(directory, '.vc-config.json'), JSON.stringify({
    runtime: 'nodejs24.x', handler: 'index.cjs', launcherType: 'Nodejs', maxDuration: 300,
  }));
  const assets = path.join(output, 'static/world');
  await fs.mkdir(path.join(assets, 'assets'), { recursive: true });
  await fs.mkdir(path.join(assets, 'sdk'), { recursive: true });
  for (const name of ['app.js', 'style.css'])
    await fs.copyFile(path.resolve(__dirname, '../world-ui', name), path.join(assets, 'assets', name));
  await fs.copyFile(path.resolve(__dirname, '../world-ui/index.html'), path.join(assets, 'verify.html'));
  for (const name of ['idkit.global.js', 'idkit_wasm_bg.wasm'])
    await fs.copyFile(path.resolve(__dirname, '../node_modules/@worldcoin/idkit-core/dist', name), path.join(assets, 'sdk', name));
  await fs.copyFile(path.resolve(__dirname, '../node_modules/qrcode-generator/dist/qrcode.js'), path.join(assets, 'sdk/qrcode.js'));
  const filename = path.join(output, 'config.json');
  const config = JSON.parse(await fs.readFile(filename, 'utf8'));
  config.routes.unshift(
    { src: '/api/mobile(?:/.*)?', dest: '/mobile' },
    { src: '/world/verify', dest: '/world/verify.html' },
    { src: '/world/public/.*', dest: '/mobile' },
  );
  await fs.writeFile(filename, JSON.stringify(config, null, 2));
  console.log('Hosted mobile API packaged.');
})().catch(error => { console.error(error); process.exitCode = 1; });
