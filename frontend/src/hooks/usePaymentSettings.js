import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export function usePaymentSettings() {
  return useQuery({
    queryKey: ['payment-settings'],
    queryFn: () => api.get('/payments/settings').then((r) => r.data),
    staleTime: 60_000,
  });
}
