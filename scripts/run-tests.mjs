import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), '..');
const defaultSourceRoot = path.join(rootDir, 'src');
const defaultSourceRoots = [defaultSourceRoot, path.join(rootDir, 'electron')];
const defaultTmpRoot = path.join(rootDir, '.tmp-tests');

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const testFilePattern = /\.test\.(?:ts|tsx|js|jsx)$/;

const testCompilerOptions = {
  module: ts.ModuleKind.ES2022,
  target: ts.ScriptTarget.ES2022,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  allowJs: true,
  importHelpers: false,
  sourceMap: false
};

class TestRunnerError extends Error {
  constructor(message, { phase, filePath, cause, exitCode = 1 } = {}) {
    super(message);
    this.name = 'TestRunnerError';
    this.phase = phase;
    this.filePath = filePath;
    this.cause = cause;
    this.exitCode = exitCode;
  }
}

const toDisplayPath = (filePath) => path.relative(rootDir, filePath) || filePath;

const parseArgs = (args) => {
  const options = {
    sourceRoots: defaultSourceRoots,
    tmpRoot: defaultTmpRoot
  };

  for (const arg of args) {
    if (arg.startsWith('--source-root=')) {
      options.sourceRoots = [path.resolve(rootDir, arg.slice('--source-root='.length))];
      continue;
    }

    if (arg.startsWith('--tmp-root=')) {
      options.tmpRoot = path.resolve(rootDir, arg.slice('--tmp-root='.length));
      continue;
    }

    throw new TestRunnerError(`Unknown argument: ${arg}`, { phase: 'arguments' });
  }

  return options;
};

export const collectSourceFiles = (directory) => {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(fullPath);
    }

    const extension = path.extname(entry.name);

    return entry.isFile() &&
      sourceExtensions.has(extension) &&
      !entry.name.endsWith('.d.ts')
      ? [fullPath]
      : [];
  });
};

const toOutputPath = (outRoot, sourceFile) => {
  const relativePath = path.relative(rootDir, sourceFile);
  return path.join(outRoot, relativePath).replace(/\.(?:ts|tsx|jsx)$/, '.js');
};

export const createExpectedManifest = (outRoot, sourceFiles) =>
  sourceFiles
    .filter((filePath) => testFilePattern.test(filePath))
    .map((sourceFile) => ({
      sourceFile,
      outputFile: toOutputPath(outRoot, sourceFile),
      transpiled: false,
      includedInRun: false
    }));

const withJsExtension = (specifier) => {
  if (specifier.startsWith('.') && specifier.endsWith('.svg?raw')) {
    return `${specifier.slice(0, -'?raw'.length)}.raw.js`;
  }

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

const formatDiagnostic = (diagnostic, fallbackFilePath) => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  const filePath = diagnostic.file?.fileName ?? fallbackFilePath;

  if (!diagnostic.file || diagnostic.start === undefined) {
    return `${filePath}: TS${diagnostic.code}: ${message}`;
  }

  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${filePath}:${line + 1}:${character + 1} TS${diagnostic.code}: ${message}`;
};

const formatError = (error) => {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
};

const printRunnerError = (error) => {
  if (error instanceof TestRunnerError) {
    console.error(`Test runner failed during ${error.phase ?? 'unknown'} stage.`);

    if (error.filePath) {
      console.error(`File: ${toDisplayPath(error.filePath)}`);
    }

    if (error.cause) {
      console.error(formatError(error.cause));
    } else {
      console.error(error.message);
    }

    return;
  }

  console.error('Test runner failed during unknown stage.');
  console.error(formatError(error));
};

export const cleanTmpRoot = (tmpRoot) => {
  try {
    rmSync(tmpRoot, { recursive: true, force: true });
  } catch (error) {
    throw new TestRunnerError('Failed to clean temporary test directory.', {
      phase: 'cleanup',
      filePath: tmpRoot,
      cause: error
    });
  }
};

export const transpileSourceFiles = (outRoot, sourceFiles, manifest) => {
  const manifestBySource = new Map(manifest.map((entry) => [entry.sourceFile, entry]));
  const writtenRawSvgModules = new Set();
  let transpiledCount = 0;

  for (const sourceFile of sourceFiles) {
    const outputFile = toOutputPath(outRoot, sourceFile);
    let source;

    try {
      source = readFileSync(sourceFile, 'utf8');
    } catch (error) {
      throw new TestRunnerError('Failed to read source file.', {
        phase: 'transpile',
        filePath: sourceFile,
        cause: error
      });
    }

    for (const match of source.matchAll(/from\s+["'](\.[^"']+\.svg\?raw)["']/g)) {
      const rawSpecifier = match[1];
      const svgSourceFile = path.resolve(
        path.dirname(sourceFile),
        rawSpecifier.slice(0, -'?raw'.length)
      );
      const relativeSvgPath = path.relative(rootDir, svgSourceFile);

      if (relativeSvgPath.startsWith('..') || path.isAbsolute(relativeSvgPath)) {
        throw new TestRunnerError('Raw SVG import resolves outside the project root.', {
          phase: 'transpile',
          filePath: svgSourceFile
        });
      }

      const rawModuleFile = path.join(outRoot, `${relativeSvgPath}.raw.js`);

      if (!writtenRawSvgModules.has(rawModuleFile)) {
        try {
          const svgSource = readFileSync(svgSourceFile, 'utf8');
          mkdirSync(path.dirname(rawModuleFile), { recursive: true });
          writeFileSync(rawModuleFile, `export default ${JSON.stringify(svgSource)};\n`, 'utf8');
          writtenRawSvgModules.add(rawModuleFile);
        } catch (error) {
          throw new TestRunnerError('Failed to create a raw SVG test module.', {
            phase: 'transpile',
            filePath: svgSourceFile,
            cause: error
          });
        }
      }
    }

    const transpiled = ts.transpileModule(source, {
      compilerOptions: testCompilerOptions,
      fileName: sourceFile,
      reportDiagnostics: true
    });

    const diagnostics = transpiled.diagnostics ?? [];

    if (diagnostics.length > 0) {
      const diagnosticMessage = diagnostics
        .map((diagnostic) => formatDiagnostic(diagnostic, sourceFile))
        .join('\n');

      throw new TestRunnerError('TypeScript reported syntax or transpile diagnostics.', {
        phase: 'transpile',
        filePath: sourceFile,
        cause: new Error(diagnosticMessage)
      });
    }

    try {
      mkdirSync(path.dirname(outputFile), { recursive: true });
      writeFileSync(outputFile, rewriteRelativeImports(transpiled.outputText), 'utf8');
    } catch (error) {
      throw new TestRunnerError('Failed to write transpiled file.', {
        phase: 'transpile',
        filePath: outputFile,
        cause: error
      });
    }

    transpiledCount += 1;

    const manifestEntry = manifestBySource.get(sourceFile);

    if (manifestEntry) {
      manifestEntry.transpiled = true;
    }
  }

  return transpiledCount;
};

export const verifyExpectedManifest = (manifest) => {
  for (const entry of manifest) {
    if (!entry.transpiled) {
      throw new TestRunnerError('Expected test file was not transpiled.', {
        phase: 'integrity',
        filePath: entry.sourceFile
      });
    }

    if (!existsSync(entry.outputFile)) {
      throw new TestRunnerError('Expected transpiled test output is missing.', {
        phase: 'integrity',
        filePath: entry.outputFile
      });
    }
  }

  const testOutputFiles = manifest.map((entry) => entry.outputFile);
  const runFileSet = new Set(testOutputFiles.map((filePath) => path.resolve(filePath)));

  for (const entry of manifest) {
    if (!runFileSet.has(path.resolve(entry.outputFile))) {
      throw new TestRunnerError('Transpiled test file was not included in the test run.', {
        phase: 'integrity',
        filePath: entry.outputFile
      });
    }

    entry.includedInRun = true;
  }

  return testOutputFiles;
};

export const runNodeTests = async (testOutputFiles) => {
  const child = spawn(
    process.execPath,
    ['--test', '--test-concurrency=1', ...testOutputFiles],
    {
      cwd: rootDir,
      stdio: 'inherit'
    }
  );

  const result = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });

  if (result.signal) {
    console.error(`Node test runner exited with signal ${result.signal}.`);
    process.kill(process.pid, result.signal);
    await new Promise((resolve) => setTimeout(resolve, 250));
    return 1;
  }

  return result.code ?? 1;
};

export const runTests = async ({
  sourceRoots = defaultSourceRoots,
  tmpRoot = defaultTmpRoot
} = {}) => {
  const sourceFiles = sourceRoots.flatMap((sourceRoot) => collectSourceFiles(sourceRoot));
  const manifest = createExpectedManifest(tmpRoot, sourceFiles);

  if (manifest.length === 0) {
    throw new TestRunnerError('No test files found.', {
      phase: 'discovery',
      filePath: sourceRoots.join(', ')
    });
  }

  cleanTmpRoot(tmpRoot);

  const transpiledCount = transpileSourceFiles(tmpRoot, sourceFiles, manifest);
  const testOutputFiles = verifyExpectedManifest(manifest);

  console.log('Test runner:');
  console.log(`- discovered: ${manifest.length} files`);
  console.log(`- transpiled: ${manifest.filter((entry) => entry.transpiled).length} files`);
  console.log(`- executed: ${testOutputFiles.length} files`);
  console.log(`- transpiled source files: ${transpiledCount} files`);

  return runNodeTests(testOutputFiles);
};

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === scriptPath;

if (isMainModule) {
  try {
    const exitCode = await runTests(parseArgs(process.argv.slice(2)));
    process.exitCode = exitCode;
  } catch (error) {
    printRunnerError(error);
    process.exitCode = error instanceof TestRunnerError ? error.exitCode : 1;
  }
}
