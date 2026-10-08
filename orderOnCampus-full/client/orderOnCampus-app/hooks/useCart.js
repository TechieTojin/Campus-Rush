import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../components/ui/feedback';
import { addToCart, selectCartCanteen, setQuantity } from '../slices/CartSlice';

export default function useCart() {
  const dispatch = useDispatch();
  const cartCanteen = useSelector(selectCartCanteen);

  const add = useCallback((item, canteen, quantity = 1, { toast = true } = {}) => {
    const commit = () => {
      dispatch(addToCart({ item, canteen, quantity }));
      if (toast) showToast(`${item.name} added to cart`, 'shopping-bag');
    };
    if (cartCanteen && cartCanteen._id !== canteen._id) {
      Alert.alert(
        'Start a new cart?',
        `Your cart has items from ${cartCanteen.name}. Orders can only include one canteen, so adding this will clear your current cart.`,
        [
          { text: 'Keep current cart', style: 'cancel' },
          { text: 'Start new cart', style: 'destructive', onPress: commit },
        ]
      );
      return;
    }
    commit();
  }, [cartCanteen, dispatch]);

  const update = useCallback((itemId, quantity) => dispatch(setQuantity({ itemId, quantity })), [dispatch]);

  return { add, update, cartCanteen };
}
