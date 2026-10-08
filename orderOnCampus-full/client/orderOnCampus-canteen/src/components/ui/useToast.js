import { createContext, useContext } from 'react';

// Provided by ToastProvider (components/ui/Feedback.jsx).
export const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);
