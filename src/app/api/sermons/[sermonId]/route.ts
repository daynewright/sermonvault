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

    // Delete all document chunks for this sermon
    const { error } = await supabase
      .from('documents')
      .delete()
      .match({ 
        sermon_id: sermonId,
        user_id: user.id 
      });

    if (error) {
      console.error('Error deleting sermon:', error);
      throw error;
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