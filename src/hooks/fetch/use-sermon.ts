import { useQuery, useMutation } from '@tanstack/react-query'

interface UseSermonOptions {
  includeConfidence?: boolean;
}

export function useSermon(id: string, options: UseSermonOptions = {}) {
  const { includeConfidence = false } = options;

  return useQuery({
    queryKey: ['sermon', id, { includeConfidence }],
    queryFn: async () => {
      const response = await fetch(`/api/sermons/${id}?confidence=${includeConfidence}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sermon');
      }
      return response.json();
    },
  });
} 

export const useDeleteSermon = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/sermons/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete sermon: ${response.statusText}`);
      }
      return response.json();
    },
  });
};
