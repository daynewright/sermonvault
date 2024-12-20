import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get unique sermons with their metadata
    const { data: sermons, error } = await supabase
      .from('documents')
      .select('sermon_id, metadata')
      .eq('user_id', user.id)
      .eq('metadata->chunkIndex', 0) // Get only first chunk to avoid duplicates
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sermons:', error);
      throw error;
    }

    // Format the response
    const formattedSermons = sermons.map(sermon => ({
      id: sermon.sermon_id,
      filename: sermon.metadata.filename,
      uploadedAt: sermon.metadata.uploadedAt,
      pageCount: sermon.metadata.pageCount
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
