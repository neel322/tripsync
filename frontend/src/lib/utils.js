import { clsx } from 'clsx';
import { format, parseISO, differenceInDays } from 'date-fns';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatDate(date) {
  if (!date) return '';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM d, yyyy');
  } catch { return String(date); }
}

export function formatCurrency(amount, symbol = '₹') {
  if (isNaN(amount)) return `${symbol}0`;
  return `${symbol}${parseFloat(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function tripDuration(startDate, endDate) {
  try {
    const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
    return `${days} day${days !== 1 ? 's' : ''}`;
  } catch { return ''; }
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

// Maps a name to a consistent Tailwind bg color using the new design tokens
export function avatarColor(name = '') {
  const palette = [
    'bg-secondary',
    'bg-[#7c3aed]',
    'bg-emerald',
    'bg-amber',
    'bg-[#db2777]',
    'bg-[#0891b2]',
    'bg-[#65a30d]',
    'bg-[#9333ea]',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return palette[hash % palette.length];
}

export function categoryIcon(category) {
  const icons = {
    food: '🍽️', transport: '🚗', accommodation: '🏨',
    activity: '🎯', shopping: '🛍️', other: '💸',
  };
  return icons[category] || '💸';
}

export function itineraryTypeIcon(type) {
  const icons = {
    activity: '🎯', travel: '✈️', food: '🍽️',
    accommodation: '🏨', other: '📌',
  };
  return icons[type] || '📌';
}
