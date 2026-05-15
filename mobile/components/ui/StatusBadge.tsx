import { View, ViewStyle } from 'react-native';
import Badge from './Badge';

interface StatusBadgeProps {
  status:
    | 'approved'
    | 'listed'
    | 'sold'
    | 'pending'
    | 'rejected'
    | 'delivered'
    | 'cancelled'
    | 'in-transit';
  style?: ViewStyle;
}

export default function StatusBadge({ status, style }: StatusBadgeProps) {
  const normalized = String(status || 'pending').toLowerCase();
  const { label, variant } = statusMap[normalized] || statusMap.pending;

  return <Badge label={label} variant={variant} style={style} />;
}

const statusMap: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }
> = {
  approved: { label: 'Approved', variant: 'success' },
  listed: { label: 'Listed', variant: 'info' },
  sold: { label: 'Sold', variant: 'success' },
  delivered: { label: 'Delivered', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  rejected: { label: 'Rejected', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  'in-transit': { label: 'In Transit', variant: 'info' },
};
