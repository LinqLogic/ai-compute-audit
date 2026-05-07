import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './App.css';
import App from './App';

const publishableKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error('REACT_APP_CLERK_PUBLISHABLE_KEY is not set in .env');
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <ClerkProvider publishableKey={publishableKey}>
    <App />
  </ClerkProvider>
);
