import { View, ViewStyle } from 'react-native';
import Badge from './Badge';

interface StatusBadgeProps {
  status: 'approved' | 'pending' | 'rejected' | 'delivered' | 'cancelled' | 'in-transit';
  style?: ViewStyle;
}

export default function StatusBadge({ status, style }: StatusBadgeProps) {
  const { label, variant } = statusMap[status] || statusMap.pending;

  return <Badge label={label} variant={variant} style={style} />;
}

const statusMap: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }
> = {
  approved: { label: 'Approved', variant: 'success' },
  delivered: { label: 'Delivered', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  rejected: { label: 'Rejected', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  'in-transit': { label: 'In Transit', variant: 'info' },
};
