var esbuild = require('esbuild');
var fs = require('node:fs');
var path = require('node:path');

var root = path.resolve(__dirname, '..');
var publicDir = path.join(root, 'app', 'public');
var assetsDir = path.join(root, 'app', 'assets');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeCssBundle() {
  var css = [
    fs.readFileSync(path.join(assetsDir, 'stylesheets', 'reset.css'), 'utf8'),
    fs.readFileSync(path.join(assetsDir, 'stylesheets', 'hive.css'), 'utf8')
  ].join('\n\n');

  fs.writeFileSync(path.join(publicDir, 'application.css'), css);
}

function copyAssets() {
  fs.copyFileSync(path.join(assetsDir, 'index.html'), path.join(publicDir, 'index.html'));
  fs.cpSync(path.join(assetsDir, 'images'), path.join(publicDir, 'images'), { recursive: true });
}

async function buildBundle(entryPoint, outfile) {
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outfile,
    platform: 'browser',
    format: 'iife',
    target: 'es2018',
    banner: {
      js: 'var global = globalThis;'
    },
    define: {
      global: 'globalThis'
    },
    logLevel: 'info'
  });
}

async function main() {
  fs.rmSync(publicDir, { recursive: true, force: true });
  ensureDir(publicDir);

  await buildBundle(path.join(assetsDir, 'javascripts', 'main.js'), path.join(publicDir, 'application.js'));
  await buildBundle(path.join(assetsDir, 'javascripts', 'workers', 'ai-worker.js'), path.join(publicDir, 'ai.js'));

  writeCssBundle();
  copyAssets();
}

main().catch(function(error) {
  console.error(error);
  process.exit(1);
});
