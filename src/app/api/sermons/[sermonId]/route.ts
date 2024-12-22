import { createServerSupabaseClient } from '@/lib/clients/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: { sermonId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const sermonId = params.sermonId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1. Get the sermon details first
    const { data: sermon, error: sermonError } = await supabase
      .from('sermons')
      .select('file_path')
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

    // 2. Delete the file from storage
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

    // 3. Delete all chunks for this sermon
    const { error: chunksError } = await supabase
      .from('sermon_chunks')
      .delete()
      .eq('sermon_id', sermonId);

    if (chunksError) {
      console.error('Error deleting sermon chunks:', chunksError);
      throw chunksError;
    }

    // 4. Delete the sermon record
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
      { error: 'Failed to delete sermon' },
      { status: 500 }
    );
  }
} 