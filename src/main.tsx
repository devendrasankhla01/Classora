import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './styles/index.css';

import { App } from './app/App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Classora: #root container was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
