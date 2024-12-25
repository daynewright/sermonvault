import { useQuery } from '@tanstack/react-query';

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