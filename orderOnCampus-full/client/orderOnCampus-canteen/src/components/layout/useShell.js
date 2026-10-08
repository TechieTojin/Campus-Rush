import { createContext, useContext } from 'react';

// Badge counts shared by the app shell (components/layout/AppShell.jsx).
export const ShellContext = createContext({ counts: {}, refreshCounts: () => {} });

export const useShell = () => useContext(ShellContext);
