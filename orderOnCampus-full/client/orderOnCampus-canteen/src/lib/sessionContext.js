import { createContext, useContext } from 'react';

// Provided by SessionProvider (lib/session.jsx).
export const SessionContext = createContext(null);

export const useSession = () => useContext(SessionContext);

// Canteen id for scoped API calls. Pages under the app shell only render once it exists.
export const useCanteenId = () => useContext(SessionContext).canteen?._id;
