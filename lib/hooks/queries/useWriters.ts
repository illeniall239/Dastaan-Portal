import { useQuery } from '@tanstack/react-query';
import type { Writer } from '@/types';

export function useWriters() {
    return useQuery({
        queryKey: ['writers'],
        queryFn: async () => {
            const response = await fetch('/api/writers/list');
            if (!response.ok) {
                throw new Error('Failed to fetch writers');
            }
            return response.json() as Promise<Writer[]>;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
