import { SermonView } from '@/components/sermon-view';

export default function SermonPage({ params }: any) {
  return (
    <div className="h-full">
      <SermonView id={params.id} />
    </div>
  );
}
