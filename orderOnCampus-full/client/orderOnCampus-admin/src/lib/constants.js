import { FiCheckCircle, FiClock, FiCoffee, FiPackage, FiPauseCircle, FiSlash, FiXCircle } from 'react-icons/fi';

export const ORDER_STATUS = {
  Placed: { label: 'New', long: 'New order', tone: 'warning', icon: FiPackage, dot: 'bg-accent' },
  Processing: { label: 'Preparing', long: 'Preparing', tone: 'info', icon: FiCoffee, dot: 'bg-info' },
  Ready: { label: 'Ready', long: 'Ready for pickup', tone: 'success', icon: FiCheckCircle, dot: 'bg-success' },
  Completed: { label: 'Completed', long: 'Completed', tone: 'neutral', icon: FiCheckCircle, dot: 'bg-faint' },
  Cancelled: { label: 'Cancelled', long: 'Cancelled', tone: 'danger', icon: FiXCircle, dot: 'bg-danger' },
};
export const ORDER_STATUSES = Object.keys(ORDER_STATUS);

export const ACTION_LABEL = {
  Processing: 'Move to preparing',
  Ready: 'Mark ready for pickup',
  Completed: 'Mark completed',
  Cancelled: 'Cancel order',
};

export const CANTEEN_STATUS = {
  active: { label: 'Active', tone: 'success', icon: FiCheckCircle },
  pending: { label: 'Pending approval', tone: 'warning', icon: FiClock },
  suspended: { label: 'Suspended', tone: 'danger', icon: FiPauseCircle },
  rejected: { label: 'Rejected', tone: 'neutral', icon: FiSlash },
};

export const ACCOUNT_STATUS = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'info' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

export const STAFF_ROLES = { manager: 'Manager', staff: 'Staff' };
export const ADMIN_ROLES = { super_admin: 'Super admin', operations: 'Operations admin' };

export const DIETARY = { veg: { label: 'Veg', tone: 'success' }, 'non-veg': { label: 'Non-veg', tone: 'danger' }, egg: { label: 'Egg', tone: 'warning' }, vegan: { label: 'Vegan', tone: 'success' } };

export const CANTEEN_TYPES = ['Multi-Cuisine', 'Cafe', 'Snacks', 'South Indian', 'North Indian', 'Bakery', 'Juice & Beverages', 'Fast Food'];

export const TICKET_STATUS = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export const TONE_STYLES = {
  info: { label: 'Info', tone: 'info' },
  success: { label: 'Good news', tone: 'success' },
  warning: { label: 'Heads-up', tone: 'warning' },
  critical: { label: 'Critical', tone: 'danger' },
};

export const AUDIENCES = { students: 'Students (app)', canteens: 'Canteens (website)', all: 'Everyone' };
