import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = readFileSync(
  path.join(process.cwd(), 'src', 'app', 'sandboxCompatibility', 'SandboxCompatibilityGate.tsx'),
  'utf8'
);
const title = '无法启用 Chromium 沙盒';
const paragraphs = [
  '当前系统阻止 AppImage 启用 Chromium 沙盒，推荐改用 NetraFlow DEB 安装版，安装时可能需要管理员授权，日常运行仍使用普通用户权限',
  '你也可以继续使用 AppImage 兼容模式，但该模式会关闭 Chromium 进程沙盒，降低进程隔离保护'
];

test('sandbox compatibility gate has one title and exactly two equal-level paragraphs', () => {
  assert.equal(source.includes(`title="${title}"`), true);
  assert.equal(source.includes('AppImage 兼容模式"'), false);
  assert.equal(source.includes('Chromium 沙盒启动受阻'), false);
  assert.equal(source.includes('eyebrow='), false);
  assert.deepEqual(
    [...source.matchAll(/<p>([^<]+)<\/p>/g)].map((match) => match[1]),
    paragraphs
  );
  assert.match(source, /<div className="modal-message">\s*<p>[^<]+<\/p>\s*<p>[^<]+<\/p>\s*<\/div>/);
  assert.equal(source.includes('modal-message strong'), false);
  assert.equal(source.includes('<strong>'), false);
});

test('sandbox compatibility product copy contains no sentence periods or extra warning level', () => {
  const productCopy = [title, ...paragraphs, '退出', '继续使用兼容模式', '正在进入'];
  assert.equal(productCopy.some((text) => text.includes('。')), false);
  assert.equal(productCopy.some((text) => text.includes('.')), false);
  assert.equal(source.includes('warning'), false);
  assert.equal(source.includes('yellow'), false);
  assert.equal(source.includes('orange'), false);
});

test('countdown, disabled state, Escape exit, and guarded consent behavior remain wired', () => {
  assert.equal(source.includes('useState(5)'), true);
  assert.equal(source.includes('disabled={secondsRemaining > 0 || isWriting}'), true);
  assert.equal(source.includes('canConfirmSandboxCompatibility('), true);
  assert.equal(source.includes("event.key === 'Escape'"), true);
  assert.equal(source.includes('quit();'), true);
  assert.equal(source.includes('window.sandboxBootstrap?.consent()'), true);
  assert.equal(source.includes('window.sandboxBootstrap?.quit()'), true);
  assert.equal(source.includes("? '正在进入'"), true);
  assert.equal(source.includes('disabled={isWriting}'), true);
  assert.equal(source.includes("event.key === 'Escape' && !isWriting"), true);
  assert.equal(source.includes('if (isWriting) return;'), true);
  assert.equal(source.includes('onThemeChanged((theme)'), true);
  assert.equal(source.includes('正在保存授权'), false);
  assert.equal(source.includes('。'), false);
});
