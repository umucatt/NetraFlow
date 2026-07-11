import assert from 'node:assert/strict';
import test from 'node:test';

import { createCoreSaveCoordinator } from './coreSaveCoordinator';

type TestAppData = {
  value: number;
  payload: {
    label: string;
  };
};

type SaveCall = {
  value: number;
  allowExternalCoreOverwrite: boolean;
  stages: string[];
};

const cloneAppData = (appData: TestAppData): TestAppData =>
  JSON.parse(JSON.stringify(appData)) as TestAppData;

const createFakeTimers = () => {
  let nextTimerId = 1;
  let now = 0;
  let maxActiveTimers = 0;
  const timers = new Map<number, { dueAt: number; handler: () => void }>();
  const createdTimerIds: number[] = [];
  const clearedTimerIds: number[] = [];

  const updateMaxActiveTimers = () => {
    maxActiveTimers = Math.max(maxActiveTimers, timers.size);
  };

  const runDueTimers = () => {
    while (true) {
      const dueTimer = Array.from(timers.entries())
        .filter(([, timer]) => timer.dueAt <= now)
        .sort((left, right) => left[1].dueAt - right[1].dueAt)[0];

      if (!dueTimer) {
        return;
      }

      const [timerId, timer] = dueTimer;
      timers.delete(timerId);
      timer.handler();
      updateMaxActiveTimers();
    }
  };

  return {
    api: {
      setTimeout: (handler: () => void, delayMs: number) => {
        const timerId = nextTimerId++;
        timers.set(timerId, { dueAt: now + delayMs, handler });
        createdTimerIds.push(timerId);
        updateMaxActiveTimers();
        return timerId;
      },
      clearTimeout: (timerId: unknown) => {
        if (typeof timerId === 'number' && timers.delete(timerId)) {
          clearedTimerIds.push(timerId);
        }
        updateMaxActiveTimers();
      }
    },
    tick: (delayMs: number) => {
      now += delayMs;
      runDueTimers();
    },
    activeCount: () => timers.size,
    maxActiveCount: () => maxActiveTimers,
    createdCount: () => createdTimerIds.length,
    clearedCount: () => clearedTimerIds.length
  };
};

const createHarness = (overrides: {
  saveAppData?: (appData: TestAppData, options: { allowExternalCoreOverwrite?: boolean }) => void;
} = {}) => {
  const timers = createFakeTimers();
  const acceptedValues: number[] = [];
  const errors: unknown[] = [];
  const prompts: Array<{ revision: number; value: number }> = [];
  const saveCalls: SaveCall[] = [];

  const coordinator = createCoreSaveCoordinator<TestAppData>({
    timerApi: timers.api,
    cloneAppData,
    saveAppData:
      overrides.saveAppData ??
      ((appData, options) => {
        const stages: string[] = [];
        stages.push('pre-temp');
        stages.push('write-temp');
        stages.push('pre-rename');
        stages.push('replace-core');
        saveCalls.push({
          value: appData.value,
          allowExternalCoreOverwrite: options.allowExternalCoreOverwrite === true,
          stages
        });
      }),
    isExternalCoreModificationError: () => false,
    showCoreIntegrityPrompt: (pendingSave) => {
      prompts.push({
        revision: pendingSave.revision,
        value: pendingSave.appData.value
      });
    },
    onCoalescedSaveError: (error) => {
      errors.push(error);
    }
  });

  return {
    acceptedValues,
    coordinator,
    errors,
    prompts,
    saveCalls,
    timers,
    update: (value: number, flush = false) =>
      coordinator.saveWithExternalModificationCheck(
        { value, payload: { label: `value-${value}` } },
        {},
        () => {
          acceptedValues.push(value);
        },
        { flush }
      )
  };
};

test('core save coordinator coalesces eight rapid updates into one latest formal save', () => {
  const harness = createHarness();

  for (let value = 1; value <= 8; value += 1) {
    assert.equal(harness.update(value), true);
    assert.equal(harness.timers.activeCount(), 1);
  }

  assert.deepEqual(harness.acceptedValues, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(harness.timers.maxActiveCount(), 1);
  assert.equal(harness.timers.createdCount(), 8);
  assert.equal(harness.timers.clearedCount(), 7);
  assert.equal(harness.saveCalls.length, 0);

  harness.timers.tick(149);
  assert.equal(harness.saveCalls.length, 0);

  harness.timers.tick(1);
  assert.equal(harness.saveCalls.length, 1);
  assert.deepEqual(harness.saveCalls[0], {
    value: 8,
    allowExternalCoreOverwrite: false,
    stages: ['pre-temp', 'write-temp', 'pre-rename', 'replace-core']
  });
  assert.equal(harness.coordinator.getState().persistedRevision, 8);
  assert.equal(harness.coordinator.getState().pendingSave, null);
  assert.equal(harness.errors.length, 0);
  assert.equal(harness.prompts.length, 0);
});

test('explicit flush cancels the trailing timer and saves immediately', () => {
  const harness = createHarness();

  assert.equal(harness.update(1), true);
  assert.equal(harness.timers.activeCount(), 1);

  assert.equal(harness.coordinator.flushLatestSave(false), true);

  assert.equal(harness.timers.activeCount(), 0);
  assert.equal(harness.timers.clearedCount(), 1);
  assert.deepEqual(harness.saveCalls.map((call) => call.value), [1]);

  harness.timers.tick(150);
  assert.deepEqual(harness.saveCalls.map((call) => call.value), [1]);
});

test('a change that arrives during a save schedules one trailing save for the latest state', () => {
  let harness: ReturnType<typeof createHarness>;
  let scheduledDuringSave = false;
  const saveCalls: SaveCall[] = [];

  harness = createHarness({
    saveAppData: (appData, options) => {
      saveCalls.push({
        value: appData.value,
        allowExternalCoreOverwrite: options.allowExternalCoreOverwrite === true,
        stages: ['pre-temp', 'write-temp', 'pre-rename', 'replace-core']
      });

      if (appData.value === 1 && !scheduledDuringSave) {
        scheduledDuringSave = true;
        assert.equal(harness.update(2), true);
      }
    }
  });

  assert.equal(harness.update(1, true), true);
  assert.deepEqual(saveCalls.map((call) => call.value), [1]);
  assert.equal(harness.timers.activeCount(), 1);
  assert.equal(harness.timers.maxActiveCount(), 1);

  harness.timers.tick(150);
  assert.deepEqual(saveCalls.map((call) => call.value), [1, 2]);
  assert.deepEqual(saveCalls.map((call) => call.stages), [
    ['pre-temp', 'write-temp', 'pre-rename', 'replace-core'],
    ['pre-temp', 'write-temp', 'pre-rename', 'replace-core']
  ]);
  assert.equal(harness.timers.activeCount(), 0);
});

test('failed coalesced save reports once and does not create an infinite retry loop', () => {
  const harness = createHarness({
    saveAppData: () => {
      throw new Error('disk unavailable');
    }
  });

  assert.equal(harness.update(1), true);
  harness.timers.tick(150);

  assert.equal(harness.errors.length, 1);
  assert.equal(harness.timers.activeCount(), 0);
  assert.equal(harness.coordinator.getState().pendingSave?.revision, 1);

  harness.timers.tick(1500);
  assert.equal(harness.errors.length, 1);
  assert.equal(harness.timers.activeCount(), 0);
});

test('destructive shutdown drops pending core data and rejects later saves', () => {
  const harness = createHarness();

  assert.equal(harness.update(1), true);
  assert.equal(harness.timers.activeCount(), 1);

  harness.coordinator.beginDestructiveShutdown();

  assert.equal(harness.coordinator.getState().destructiveShutdown, true);
  assert.equal(harness.coordinator.getState().pendingSave, null);
  assert.equal(harness.coordinator.hasPendingSaveData(), false);
  assert.equal(harness.timers.activeCount(), 0);
  assert.equal(harness.coordinator.flushLatestSave(false), false);
  assert.equal(harness.update(2), false);

  harness.timers.tick(1500);
  assert.deepEqual(harness.saveCalls, []);
  assert.deepEqual(harness.acceptedValues, [1]);
});
