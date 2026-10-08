import { FiCheckCircle, FiCoffee, FiPackage, FiXCircle } from 'react-icons/fi';

export const STATUS = {
  Placed: { label: 'New', long: 'New order', tone: 'saffron', icon: FiPackage, dot: 'bg-saffron-500', column: 'border-saffron-400' },
  Processing: { label: 'Preparing', long: 'Preparing', tone: 'info', icon: FiCoffee, dot: 'bg-sky-500', column: 'border-sky-400' },
  Ready: { label: 'Ready', long: 'Ready for pickup', tone: 'success', icon: FiCheckCircle, dot: 'bg-emerald-500', column: 'border-emerald-400' },
  Completed: { label: 'Completed', long: 'Completed', tone: 'neutral', icon: FiCheckCircle, dot: 'bg-faint', column: 'border-faint' },
  Cancelled: { label: 'Cancelled', long: 'Cancelled', tone: 'danger', icon: FiXCircle, dot: 'bg-red-500', column: 'border-red-300' },
};

// Action labels for each permitted transition (see TRANSITIONS in lib/api).
export const ACTION_LABEL = {
  Processing: 'Accept & start preparing',
  Ready: 'Mark ready for pickup',
  Completed: 'Mark collected',
  Cancelled: 'Reject order',
};

export const DIETARY = { veg: { label: 'Veg', tone: 'success' }, 'non-veg': { label: 'Non-veg', tone: 'danger' }, egg: { label: 'Egg', tone: 'saffron' }, vegan: { label: 'Vegan', tone: 'success' } };

export const CANTEEN_TYPES = ['Multi-Cuisine', 'Cafe', 'Snacks', 'South Indian', 'North Indian', 'Bakery', 'Juice & Beverages', 'Fast Food'];
