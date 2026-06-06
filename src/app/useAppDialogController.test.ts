import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAppDialogControllerModel,
  type AppDialogControllerSnapshot
} from './useAppDialogController';

const createController = () => {
  const snapshots: AppDialogControllerSnapshot[] = [];
  const controller = createAppDialogControllerModel((snapshot) => {
    snapshots.push(snapshot);
  });

  return { controller, snapshots };
};

test('confirmation request opens, confirms, and clears state', async () => {
  const { controller } = createController();
  const result = controller.requestConfirmationDialog({
    title: 'Confirm title',
    message: 'Confirm message',
    confirmLabel: 'Confirm'
  });

  assert.equal(controller.getSnapshot().confirmationDialog?.title, 'Confirm title');

  controller.confirmAndClose();

  assert.equal(await result, true);
  assert.equal(controller.getSnapshot().confirmationDialog, null);
});

test('confirmation cancel and close both resolve false and clear state', async () => {
  const { controller } = createController();
  const cancelled = controller.requestConfirmationDialog({
    title: 'Cancel title',
    message: 'Cancel message',
    confirmLabel: 'Confirm'
  });

  controller.closeConfirmationDialog();

  assert.equal(await cancelled, false);
  assert.equal(controller.getSnapshot().confirmationDialog, null);

  const closed = controller.requestConfirmationDialog({
    title: 'Close title',
    message: 'Close message',
    confirmLabel: 'Confirm'
  });

  controller.closeConfirmationDialog();

  assert.equal(await closed, false);
  assert.equal(controller.getSnapshot().confirmationDialog, null);
});

test('consecutive confirmation requests cancel the previous request', async () => {
  const { controller } = createController();
  const first = controller.requestConfirmationDialog({
    title: 'First',
    message: 'First message',
    confirmLabel: 'Confirm'
  });
  const second = controller.requestConfirmationDialog({
    title: 'Second',
    message: 'Second message',
    confirmLabel: 'Confirm'
  });

  assert.equal(await first, false);
  assert.equal(controller.getSnapshot().confirmationDialog?.title, 'Second');

  controller.confirmAndClose();

  assert.equal(await second, true);
});

test('callback confirmation runs the selected action only once', () => {
  const { controller } = createController();
  let confirmCount = 0;
  let cancelCount = 0;

  controller.showConfirmationDialog({
    title: 'Callback',
    message: 'Callback message',
    confirmLabel: 'Confirm',
    onConfirm: () => {
      confirmCount += 1;
    },
    onCancel: () => {
      cancelCount += 1;
    }
  });
  controller.confirmAndClose();
  controller.confirmAndClose();

  assert.equal(confirmCount, 1);
  assert.equal(cancelCount, 0);

  controller.showConfirmationDialog({
    title: 'Callback cancel',
    message: 'Callback cancel message',
    confirmLabel: 'Confirm',
    onConfirm: () => {
      confirmCount += 1;
    },
    onCancel: () => {
      cancelCount += 1;
    }
  });
  controller.closeConfirmationDialog();

  assert.equal(confirmCount, 1);
  assert.equal(cancelCount, 1);
});

test('input request opens with defaults, submits value, and clears state', async () => {
  const { controller } = createController();
  const result = controller.requestInputDialog({
    title: 'Input title',
    message: 'Input message',
    label: 'Input label',
    confirmLabel: 'Submit',
    inputType: 'password',
    autoComplete: 'current-password',
    defaultValue: 'seed'
  });

  assert.equal(controller.getSnapshot().inputDialog?.title, 'Input title');
  assert.equal(controller.getSnapshot().inputDialog?.inputType, 'password');
  assert.equal(controller.getSnapshot().inputDialogValue, 'seed');

  controller.setInputDialogValue('submitted value');
  controller.confirmInputDialog();

  assert.equal(await result, 'submitted value');
  assert.equal(controller.getSnapshot().inputDialog, null);
  assert.equal(controller.getSnapshot().inputDialogValue, '');
});

test('input cancel and close both resolve null and clear state', async () => {
  const { controller } = createController();
  const cancelled = controller.requestInputDialog({
    title: 'Input cancel',
    label: 'Input label',
    confirmLabel: 'Submit'
  });

  controller.closeInputDialog();

  assert.equal(await cancelled, null);
  assert.equal(controller.getSnapshot().inputDialog, null);

  const closed = controller.requestInputDialog({
    title: 'Input close',
    label: 'Input label',
    confirmLabel: 'Submit'
  });

  controller.closeInputDialog();

  assert.equal(await closed, null);
  assert.equal(controller.getSnapshot().inputDialog, null);
});

test('consecutive input requests cancel the previous request', async () => {
  const { controller } = createController();
  const first = controller.requestInputDialog({
    title: 'First input',
    label: 'Input label',
    confirmLabel: 'Submit'
  });
  const second = controller.requestInputDialog({
    title: 'Second input',
    label: 'Input label',
    confirmLabel: 'Submit'
  });

  assert.equal(await first, null);
  assert.equal(controller.getSnapshot().inputDialog?.title, 'Second input');

  controller.setInputDialogValue('second value');
  controller.confirmInputDialog();

  assert.equal(await second, 'second value');
});

test('notice request opens, closes, and clears state', async () => {
  const { controller } = createController();
  const result = controller.showNoticeDialog({
    title: 'Notice title',
    message: 'Notice message',
    confirmLabel: 'Close'
  });

  assert.equal(controller.getSnapshot().noticeDialog?.title, 'Notice title');

  controller.closeNoticeDialog();

  await result;
  assert.equal(controller.getSnapshot().noticeDialog, null);
});

test('consecutive notices replace content and resolve the previous notice', async () => {
  const { controller } = createController();
  const first = controller.showNoticeDialog({
    title: 'First notice',
    message: 'First message'
  });
  const second = controller.showNoticeDialog({
    title: 'Second notice',
    message: 'Second message'
  });

  await first;
  assert.equal(controller.getSnapshot().noticeDialog?.title, 'Second notice');

  controller.closeNoticeDialog();

  await second;
  assert.equal(controller.getSnapshot().noticeDialog, null);
});
