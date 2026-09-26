const fs = require('node:fs');
const path = require('node:path');
const ts = require(require.resolve('typescript', {
  paths: [path.resolve(__dirname, '../../mobile'), path.resolve(__dirname, '../../web')],
}));
// Both platforms execute the same balance, fee and idempotency rules.
const output = path.resolve(__dirname, '../build');
fs.mkdirSync(output, { recursive: true });
for (const name of ['refundQuote', 'demoLedger']) {
  const source = fs.readFileSync(
    path.resolve(__dirname, `../../mobile/src/lib/${name}.ts`),
    'utf8',
  );
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  fs.writeFileSync(path.join(output, `${name}.js`), result.outputText);
}
