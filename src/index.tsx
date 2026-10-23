import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installGlobalErrorHandlers } from './lib/errorReporter';
import reportWebVitals from './reportWebVitals';

// Report uncaught browser errors and unhandled promise rejections. Reporting is
// fire-and-forget: it can never block rendering or throw into the app.
installGlobalErrorHandlers();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
