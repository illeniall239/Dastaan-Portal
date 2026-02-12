import { useQuery } from '@tanstack/react-query';

export interface Genre {
    id: string;
    name: string;
    is_predefined?: boolean;
}

export function useGenres() {
    return useQuery({
        queryKey: ['genres'],
        queryFn: async () => {
            const response = await fetch('/api/genres');
            if (!response.ok) {
                throw new Error('Failed to fetch genres');
            }
            const data = await response.json();
            return data.genres as Genre[];
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
