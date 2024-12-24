import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { extractTextFromPdf } from '@/app/api/lib/utils/pdf-extractor';
import { validateSermonContent } from '@/app/api/lib/utils/sermon-validator';

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    // Basic validation
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    // Extract text using our existing LangChain loader
    const text = await extractTextFromPdf(file);

    // Validate if it's a sermon
    const validation = await validateSermonContent(text);
    if (!validation.isSermon) {
      return NextResponse.json({ 
        error: 'This file does not appear to be a sermon', 
        reason: validation.reason 
      }, { status: 400 });
    }

    // Create processing record
    const { data: processingRecord } = await supabase
      .from('sermon_processing')
      .insert({
        user_id: user.id,
        status: 'uploaded',
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        text: text,
      })
      .select()
      .single();

    return NextResponse.json({ 
      processingId: processingRecord.id,
      status: 'uploaded',
      confidence: validation.confidence
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
