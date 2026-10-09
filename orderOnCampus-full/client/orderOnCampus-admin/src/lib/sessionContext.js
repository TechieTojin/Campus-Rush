import { createContext, useContext } from 'react';

// Provided by SessionProvider (lib/session.jsx).
export const SessionContext = createContext(null);

export const useSession = () => useContext(SessionContext);
