import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { getAppIconResource } from './app/branding/appIcon';
import { installTextInputAssistanceGuard } from './textInputAssistance';
import './styles.css';
import { SandboxCompatibilityGate } from './app/sandboxCompatibility';

const App = lazy(() => import('./App'));

installTextInputAssistanceGuard();

if (window.appInfo?.sandboxConsentBootstrap) {
  const initialTheme = window.sandboxBootstrap?.initialTheme;
  document.documentElement.dataset.theme = initialTheme === 'dark' ? 'dark' : 'light';
} else if (window.appInfo?.initialTheme) {
  document.documentElement.dataset.theme = window.appInfo.initialTheme;
  document.documentElement.dataset.resolvedTheme = window.appInfo.initialTheme;
}

const favicon = document.querySelector<HTMLLinkElement>('#app-favicon');

if (favicon) {
  favicon.href = getAppIconResource(window.appInfo?.platform);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.appInfo?.sandboxConsentBootstrap ? (
      <SandboxCompatibilityGate />
    ) : (
      <Suspense fallback={null}><App /></Suspense>
    )}
  </React.StrictMode>
);
