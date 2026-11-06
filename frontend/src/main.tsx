import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Provider } from 'react-redux';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource-variable/manrope';
import App from './App';
import { campusTheme } from './theme';
import { store } from './store/store';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Не найден корневой элемент приложения');
}

createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={campusTheme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
