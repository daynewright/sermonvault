import { SermonData } from '@/types/sermonData';
import { useMutation, useQuery } from '@tanstack/react-query';

const fetchSermons = async () => {
  const response = await fetch('/api/sermons');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};
export const useSermons = () => {
  return useQuery({
    queryKey: ['sermons'],
    queryFn: fetchSermons
  })
};

type UpdateSermonParams = {
  sermonId: string;
  data: { [key in keyof SermonData]: SermonData[key]['value'] };
};

const updateSermon = async ({sermonId, data}: UpdateSermonParams): Promise<Response> => {
    const response = await fetch(`/api/sermons/${sermonId}`, {
      method: 'PATCH',
      headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to update sermon');
  }

    return response;
};

export const useUpdateSermon = () => {
  return useMutation({
    mutationFn: updateSermon
  })
}