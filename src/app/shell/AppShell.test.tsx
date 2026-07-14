import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppShell } from './AppShell';

test('app shell uses only its top-level main landmark as the programmatic focus target', () => {
  const markup = renderToStaticMarkup(
    <AppShell
      className="app-shell"
      mainContentClassName="left-browse-panel"
      mainContent={<button type="button">主操作</button>}
      rightPanel={<button type="button">侧栏操作</button>}
      rightPanelAriaLabel="操作面板"
    />
  );

  assert.match(
    markup,
    /<main[^>]*class="app-shell app-shell--focus-restore-target"[^>]*tabindex="-1"/
  );
  assert.match(markup, /<section[^>]*class="left-browse-panel"[^>]*>/);
  assert.match(markup, /<aside[^>]*class="right-action-panel"[^>]*>/);
  assert.doesNotMatch(markup, /<section[^>]*tabindex=/);
  assert.doesNotMatch(markup, /<aside[^>]*tabindex=/);
  assert.doesNotMatch(markup, /<(section|aside)[^>]*role=/);
});
