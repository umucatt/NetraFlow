import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldReuseActiveToast } from './useToastController';

const activeToast = {
  id: 'toast-1',
  message: '未启用登录密码保护',
  tone: 'info' as const
};

test('an identical toast is reused only while the same message and tone remain active', () => {
  assert.equal(
    shouldReuseActiveToast(activeToast, '未启用登录密码保护', 'info'),
    true
  );
  assert.equal(
    shouldReuseActiveToast(activeToast, '未启用登录密码保护', 'error'),
    false
  );
  assert.equal(shouldReuseActiveToast(activeToast, '其他错误', 'info'), false);
  assert.equal(shouldReuseActiveToast(null, '未启用登录密码保护', 'info'), false);
});
