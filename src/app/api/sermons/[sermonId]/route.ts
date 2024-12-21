import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sermonId: string }> }
) {
  try {
    const resolvedParams = await params;
    const sermonId = resolvedParams.sermonId;
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First, get the file path from the documents table
    const { data: documentData } = await supabase
      .from('documents')
      .select('file_path')
      .eq('sermon_id', sermonId)
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (documentData?.file_path) {
      // Delete the file from storage
      const { error: storageError } = await supabase
        .storage
        .from('sermons')
        .remove([documentData.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with document deletion even if storage deletion fails
      }
    }

    // Delete all document chunks for this sermon
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .match({ 
        sermon_id: sermonId,
        user_id: user.id 
      });

    if (dbError) {
      console.error('Error deleting sermon:', dbError);
      throw dbError;
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