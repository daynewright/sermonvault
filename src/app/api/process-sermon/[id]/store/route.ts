import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { ProcessingRecord } from '@/types/processingRecord';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let processingRecord: ProcessingRecord | null = null;

  try {
    const supabase = createServerSupabaseClient();
    
    // Get the processing record and user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: record, error } = await supabase
      .from('sermon_processing')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: 'Processing record not found' }, { status: 404 });
    }

    processingRecord = record;

    // Verify ownership
    if (processingRecord?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (processingRecord.status !== 'vectorized') {
      return NextResponse.json({ 
        error: `Invalid state for storage. Current state: ${processingRecord.status}`, 
        currentStatus: processingRecord.status 
      }, { status: 400 });
    }

    // Get the file from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    // Store the file in Supabase Storage with user-specific path
    const filePath = `${user.id}/${processingRecord.sermon_id}/${processingRecord.file_name}`;
    const { error: uploadError } = await supabase.storage
      .from('sermons')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('sermons')
      .getPublicUrl(filePath);

    // Update sermon record with file path
    await supabase
      .from('sermons')
      .update({ 
        file_path: filePath,
        public_url: publicUrl
      })
      .eq('id', processingRecord.sermon_id);

    // Update processing record to completed
    await supabase
      .from('sermon_processing')
      .update({ 
        status: 'completed'
      })
      .eq('id', id);

    return NextResponse.json({ 
      processingId: id,
      sermonId: processingRecord.sermon_id,
      status: 'completed',
      filePath,
      publicUrl
    });

  } catch (error) {
    console.error('Storage error:', error);
    
    if (processingRecord) {
      try {
        const supabase = createServerSupabaseClient();
        await supabase
          .from('sermon_processing')
          .update({ 
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Storage failed'
          })
          .eq('id', id);
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

    return NextResponse.json({ 
      error: 'Failed to store sermon',
      step: 'store'
    }, { status: 500 });
  }
}