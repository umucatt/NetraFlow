import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(rootDir, 'src');
const outRoot = path.join(rootDir, '.tmp-tests', 'src');

const collectSourceFiles = (directory) => {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(fullPath);
    }

    return entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.d.ts')
      ? [fullPath]
      : [];
  });
};

const withJsExtension = (specifier) => {
  if (!specifier.startsWith('.') || path.extname(specifier)) {
    return specifier;
  }

  return `${specifier}.js`;
};

const rewriteRelativeImports = (code) =>
  code
    .replace(/(from\s+["'])(\.[^"']+)(["'])/g, (_, prefix, specifier, suffix) =>
      `${prefix}${withJsExtension(specifier)}${suffix}`
    )
    .replace(/(import\s+["'])(\.[^"']+)(["'])/g, (_, prefix, specifier, suffix) =>
      `${prefix}${withJsExtension(specifier)}${suffix}`
    );

const sourceFiles = collectSourceFiles(sourceRoot);
const testFiles = sourceFiles.filter(
  (filePath) => filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')
);

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

rmSync(path.join(rootDir, '.tmp-tests'), { recursive: true, force: true });

sourceFiles.forEach((sourceFile) => {
  const relativePath = path.relative(sourceRoot, sourceFile);
  const outputFile = path.join(outRoot, relativePath).replace(/\.(ts|tsx)$/, '.js');
  const source = readFileSync(sourceFile, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      importHelpers: false,
      sourceMap: false
    },
    fileName: sourceFile
  });

  mkdirSync(path.dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, rewriteRelativeImports(transpiled.outputText), 'utf8');
});

for (const testFile of testFiles) {
  const relativePath = path.relative(sourceRoot, testFile).replace(/\.(ts|tsx)$/, '.js');
  const outputFile = path.join(outRoot, relativePath);

  await import(pathToFileURL(outputFile).href);
}
