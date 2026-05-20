import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installTextInputAssistanceGuard } from './textInputAssistance';
import './styles.css';

installTextInputAssistanceGuard();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
