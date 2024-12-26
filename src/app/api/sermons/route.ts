import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get unique sermons with their metadata
    const { data: sermons, error } = await supabase
      .from('sermons')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sermons:', error);
      throw error;
    }

    // Format the response based on our actual schema
    const formattedSermons = sermons.map((sermon: any) => ({
      id: sermon.id,
      title: sermon.title,
      date: sermon.date,
      preacher: sermon.preacher,
      series: sermon.series,
      location: sermon.location,
      filePath: sermon.file_path,
      fileName: sermon.file_name,
      fileSize: sermon.file_size,
      pageCount: sermon.file_pages,
      uploadedAt: sermon.created_at,
      primaryScripture: sermon.primary_scripture,
      sermonType: sermon.sermon_type,
      topics: sermon.topics,
      tags: sermon.tags,
      summary: sermon.summary,
      keyPoints: sermon.key_points,
      illustrations: sermon.illustrations,
      themes: sermon.themes,
      callsToAction: sermon.calls_to_action,
      personalStories: sermon.personal_stories,
      tone: sermon.tone,
      mentionedPeople: sermon.mentioned_people,
      mentionedEvents: sermon.mentioned_events,
      wordCount: sermon.word_count,
      keywords: sermon.keywords,
    }));

    return NextResponse.json(formattedSermons);

  } catch (error) {
    console.error('Sermons fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sermons' },
      { status: 500 }
    );
  }
}
