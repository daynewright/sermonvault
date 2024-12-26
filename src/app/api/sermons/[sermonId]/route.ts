import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { SermonField } from '@/types/sermonData';

export async function DELETE(req: Request, { params }: { params: Promise<{ sermonId: string }> }) {
  try {
    const supabase = createServerSupabaseClient();
    const { sermonId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1. Get both sermon and processing details
    const { data: sermon, error: sermonError } = await supabase
      .from('sermons')
      .select(`
        file_path,
        processing_id
      `)
      .eq('id', sermonId)
      .eq('user_id', user.id)
      .single();

    if (sermonError) {
      console.error('Error fetching sermon:', sermonError);
      throw sermonError;
    }

    if (!sermon) {
      return NextResponse.json(
        { error: 'Sermon not found' },
        { status: 404 }
      );
    }

    // 2. Delete all chunks first
    const { error: chunksError } = await supabase
      .from('sermon_chunks')
      .delete()
      .eq('sermon_id', sermonId);

    if (chunksError) {
      console.error('Error deleting sermon chunks:', chunksError);
      throw chunksError;
    }

    // 3. Delete the processing record using a direct query
    const { error: processingError } = await supabase
      .from('sermon_processing')
      .delete()
      .match({ sermon_id: sermonId });

    if (processingError) {
      console.error('Error deleting processing record:', processingError);
      throw processingError;
    }

    // 4. Delete the file from storage if it exists
    if (sermon.file_path) {
      const { error: storageError } = await supabase
        .storage
        .from('sermons')
        .remove([sermon.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with deletion even if storage fails
      }
    }

    // 5. Finally delete the sermon record
    const { error: deleteError } = await supabase
      .from('sermons')
      .delete()
      .eq('id', sermonId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting sermon:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete sermon error:', error);
    return NextResponse.json(
      { error: 'Failed to delete sermon', details: error },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ sermonId: string }> }) {
  const supabase = createServerSupabaseClient();
  const { sermonId } = await params;
  const { searchParams } = new URL(req.url);

  const includeConfidence = searchParams.get('confidence') === 'true';
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { data: sermon, error: sermonError } = await supabase
    .from('sermons')
    .select('*')
    .eq('id', sermonId)
    .eq('user_id', user.id)
    .single();

  if (sermonError) {
    console.error('Error fetching sermon:', sermonError);
    return NextResponse.json(
      { error: 'Failed to fetch sermon' },
      { status: 500 }
    );
  }

  if (!sermon) {
    return NextResponse.json(
      { error: 'Sermon not found' },
      { status: 404 }
    );
  }

  if (includeConfidence) {
  // Transform the sermon data
  const fields: Record<string, SermonField> = {
    id: { value: sermon.id, confidence: sermon.confidence_scores?.id || 0 },
    primary_scripture: { value: sermon.primary_scripture, confidence: sermon.confidence_scores?.primary_scripture || 0 },
    scriptures: { value: sermon.scriptures, confidence: sermon.confidence_scores?.scriptures || 0 },
    summary: { value: sermon.summary, confidence: sermon.confidence_scores?.summary || 0 },
    sermon_type: { value: sermon.sermon_type, confidence: sermon.confidence_scores?.sermon_type || 0 },
    key_points: { value: sermon.key_points, confidence: sermon.confidence_scores?.key_points || 0 },
    illustrations: { value: sermon.illustrations, confidence: sermon.confidence_scores?.illustrations || 0 },
    themes: { value: sermon.themes, confidence: sermon.confidence_scores?.themes || 0 },
    calls_to_action: { value: sermon.calls_to_action, confidence: sermon.confidence_scores?.calls_to_action || 0 },
    word_count: { value: sermon.word_count, confidence: sermon.confidence_scores?.word_count || 0 },
    personal_stories: { value: sermon.personal_stories, confidence: sermon.confidence_scores?.personal_stories || 0 },
    mentioned_people: { value: sermon.mentioned_people, confidence: sermon.confidence_scores?.mentioned_people || 0 },
    mentioned_events: { value: sermon.mentioned_events, confidence: sermon.confidence_scores?.mentioned_events || 0 },
    engagement_tags: { value: sermon.engagement_tags, confidence: sermon.confidence_scores?.engagement_tags || 0 },
    tone: { value: sermon.tone, confidence: sermon.confidence_scores?.tone || 0 },
    title: { value: sermon.title, confidence: sermon.confidence_scores?.title || 0 },
    date: { value: sermon.date, confidence: sermon.confidence_scores?.date || 0 },
    preacher: { value: sermon.preacher, confidence: sermon.confidence_scores?.preacher || 0 },
    topics: { value: sermon.topics, confidence: sermon.confidence_scores?.topics || 0 },
    tags: { value: sermon.tags, confidence: sermon.confidence_scores?.tags || 0 },
    series: { value: sermon.series, confidence: sermon.confidence_scores?.series || 0 },
    location: { value: sermon.location, confidence: sermon.confidence_scores?.location || 0 },
    keywords: { value: sermon.keywords, confidence: sermon.confidence_scores?.keywords || 0 }
  };

  return NextResponse.json(fields);
  }

  return NextResponse.json(sermon);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ sermonId: string }> }) {
  try {
    const supabase = createServerSupabaseClient();
    const { sermonId } = await params;
    
    // Read the request body
    const body = await req.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: sermon, error: sermonError } = await supabase
      .from('sermons')
      .update({
        ...body
      })
      .eq('id', sermonId)
      .eq('user_id', user.id)
      .select('id, title, created_at, updated_at')
      .single();

    if (sermonError) {
      console.error('Error updating sermon:', sermonError);
      return NextResponse.json(
        { error: 'Failed to update sermon' },
        { status: 500 }
      );
    }

    return NextResponse.json(sermon);
  } catch (error) {
    console.error('Error updating sermon:', error);
    return NextResponse.json(
      { error: 'Failed to update sermon' },
      { status: 500 }
    );
  }
} 