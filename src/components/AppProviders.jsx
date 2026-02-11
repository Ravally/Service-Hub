import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { AppStateProvider } from '../contexts/AppStateContext';

/**
 * Wraps the application with all required context providers.
 * The order matters: AuthProvider must be outer since AppState may need auth info.
 */
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <AppStateProvider>
        {children}
      </AppStateProvider>
    </AuthProvider>
  );
}
