import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import ConnectionPill from './components/ConnectionPill';
import { ToastHost } from './components/ui/feedback';
import { ConfirmHost } from './components/ui/sheet';
import { setFontsReady } from './components/ui/text';
import Navigation from './router/navigation';
import { store } from './store';

// Keep the native splash up until fonts are ready, so the first frame is already on-brand.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Plus Jakarta Sans, SIL Open Font License 1.1 (see assets/fonts/LICENSE.md).
const FONTS = {
  PlusJakartaSans_400Regular: require('./assets/fonts/PlusJakartaSans-400Regular.ttf'),
  PlusJakartaSans_500Medium: require('./assets/fonts/PlusJakartaSans-500Medium.ttf'),
  PlusJakartaSans_600SemiBold: require('./assets/fonts/PlusJakartaSans-600SemiBold.ttf'),
  PlusJakartaSans_700Bold: require('./assets/fonts/PlusJakartaSans-700Bold.ttf'),
  PlusJakartaSans_800ExtraBold: require('./assets/fonts/PlusJakartaSans-800ExtraBold.ttf'),
};

export default function App() {
  const [loaded, error] = useFonts(FONTS);
  // If fonts fail to load the app still works with the system font.
  if (!loaded && !error) return null;
  setFontsReady(!!loaded);
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Navigation />
        <ConnectionPill />
        <ToastHost />
        <ConfirmHost />
      </SafeAreaProvider>
    </Provider>
  );
}
