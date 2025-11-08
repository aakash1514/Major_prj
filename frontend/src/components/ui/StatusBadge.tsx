import React from 'react';
import { Badge } from './Badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getVariantByStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'approved':
      case 'confirmed':
      case 'delivered':
      case 'active':
        return 'success';
      case 'rejected':
      case 'unavailable':
        return 'danger';
      case 'inspected':
      case 'in-transit':
      case 'listed':
      case 'assigned':
      case 'loaded':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatStatusLabel = (status: string) => {
    // Convert 'in-transit' to 'In Transit'
    return status
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Badge 
      variant={getVariantByStatus(status)} 
      className={className}
    >
      {formatStatusLabel(status)}
    </Badge>
  );
};