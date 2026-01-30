import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

// Import global styles (Tailwind + custom rules)
import './styles.css';

// Optional: add React Router or other providers here in the future
// import { BrowserRouter } from 'react-router-dom';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure <div id="root"></div> exists in index.html');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* 
      Example of future provider wrapping (uncomment when needed):
      
      <BrowserRouter>
        <QueryClientProvider client={new QueryClient()}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    */}
    <App />
  </React.StrictMode>
);