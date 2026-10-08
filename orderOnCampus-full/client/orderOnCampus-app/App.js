import { StripeProvider } from '@stripe/stripe-react-native';
import { Provider } from 'react-redux';
import Navigation from './router/navigation';
import { store } from './store';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
export default function App() {

  return (

    <Provider store={store}>
      <StripeProvider publishableKey= {STRIPE_KEY}>
        <Navigation />
      </StripeProvider>
    </Provider>
  );
}


