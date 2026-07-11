import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { getAppIconResource } from './app/branding/appIcon';
import { installTextInputAssistanceGuard } from './textInputAssistance';
import './styles.css';

installTextInputAssistanceGuard();

const favicon = document.querySelector<HTMLLinkElement>('#app-favicon');

if (favicon) {
  favicon.href = getAppIconResource(window.appInfo?.platform);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
