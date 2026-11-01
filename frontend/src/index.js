import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import * as serviceWorker from './serviceWorker';

const publishableKey =
  process.env.REACT_APP_CLERK_PUBLISHABLE_KEY ||
  process.env.VITE_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY;

const root = createRoot(document.getElementById('root'));

window.addEventListener('error', (event) => {
  console.error('[Frontend global error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Frontend unhandled promise rejection]', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={publishableKey}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
