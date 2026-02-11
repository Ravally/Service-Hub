import React from 'react';

// Context providers
import AppProviders from './components/AppProviders';
import { useAuth } from './contexts/AuthContext';
import { useAppState } from './contexts/AppStateContext';

// Hooks
import { useFirebaseSubscriptions, usePublicAccess, useAppHandlers } from './hooks/data';

// Main content component
import AppContent from './components/AppContent';

/**
 * Inner App component that has access to both Auth and AppState contexts.
 * Sets up Firebase subscriptions, public access detection, and all handlers,
 * then delegates rendering to AppContent.
 */
function AppInner() {
  const auth = useAuth();
  const appState = useAppState();
  const { userId, userProfile } = auth;

  // Set up Firebase real-time subscriptions when authenticated
  useFirebaseSubscriptions(userId, appState);

  // Detect public quote/portal tokens from URL
  usePublicAccess(appState);

  // All business logic handlers
  const handlers = useAppHandlers(userId, userProfile, appState);

  return (
    <AppContent
      auth={auth}
      appState={appState}
      handlers={handlers}
    />
  );
}

/**
 * Root App component.
 * Wraps the entire application with context providers.
 */
export default function App() {
  return (
    <AppProviders>
      <AppInner />
    </AppProviders>
  );
}
