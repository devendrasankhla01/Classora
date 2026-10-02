import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { AppRoutes } from '@/app/routes';

/**
 * Classora application root: initialises local/cloud data, then renders the
 * routed screens inside the shared app shell.
 */
export function App() {
  const initialize = useClassora((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
