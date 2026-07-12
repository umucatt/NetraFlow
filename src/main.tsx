import React, { lazy, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { getAppIconResource } from './app/branding/appIcon';
import { installTextInputAssistanceGuard } from './textInputAssistance';
import './styles.css';
import { SandboxCompatibilityGate } from './app/sandboxCompatibility';

const App = lazy(() => import('./App'));

function ClearingPage() {
  useEffect(() => {
    window.electronAPI?.notifyClearingPageReady?.();
  }, []);
  return (
    <main className="destructive-clearing-page" aria-live="polite">
      <div className="destructive-clearing-page__status">
        <span>正在清除全部数据</span><span className="destructive-clearing-page__dots" aria-hidden="true" />
      </div>
    </main>
  );
}

function NormalApplicationRoot() {
  const [clearing, setClearing] = useState(false);
  useEffect(() => {
    const enter = () => setClearing(true);
    window.addEventListener('netraflow-enter-clearing-page', enter);
    const unsubscribe = window.electronAPI?.onEnterClearingPage?.(enter);
    return () => {
      window.removeEventListener('netraflow-enter-clearing-page', enter);
      unsubscribe?.();
    };
  }, []);
  return clearing ? <ClearingPage /> : <Suspense fallback={null}><App /></Suspense>;
}

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
      <NormalApplicationRoot />
    )}
  </React.StrictMode>
);
