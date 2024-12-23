import { NextResponse } from 'next/server';
import { processSermonUpload } from '@/app/api/lib/services/sermon-service';
import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const result = await processSermonUpload(supabase, file, user.id);
    console.log('Upload result:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}
