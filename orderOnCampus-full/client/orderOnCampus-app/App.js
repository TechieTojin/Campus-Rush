import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import ConnectionPill from './components/ConnectionPill';
import { ToastHost } from './components/ui/feedback';
import Navigation from './router/navigation';
import { store } from './store';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Navigation />
        <ConnectionPill />
        <ToastHost />
      </SafeAreaProvider>
    </Provider>
  );
}
