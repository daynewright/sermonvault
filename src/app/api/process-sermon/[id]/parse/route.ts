import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { extractSermonMetadata } from '@/app/api/lib/utils/sermon-parser';
import { ProcessingRecord } from '@/types/processingRecord';


export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }>  }
) {
 const { id } = await params;
  
  let processingRecord: ProcessingRecord | null = null;

  try {
    const supabase = createServerSupabaseClient();
    
    // Get the processing record
    const { data: record, error } = await supabase
      .from('sermon_processing')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: 'Processing record not found' }, { status: 404 });
    }

    processingRecord = record;

    if (processingRecord?.status !== 'uploaded') {
      return NextResponse.json({ 
        error: `Invalid state for parsing. Current state: ${processingRecord?.status}`, 
        currentStatus: processingRecord?.status 
      }, { status: 400 });
    }

    // Extract metadata using AI
    const extractedMetadata = await extractSermonMetadata(processingRecord.text);

    // Create the sermon record with extracted metadata, providing defaults for required fields
    const { data: sermon, error: sermonError } = await supabase
      .from('sermons')
      .insert({
        title: extractedMetadata.title || 'Untitled Sermon',
        date: extractedMetadata.date || new Date().toISOString().split('T')[0],
        series: extractedMetadata.series || null,
        primary_scripture: extractedMetadata.primary_scripture || null,
        scriptures: extractedMetadata.scriptures || [],
        sermon_type: extractedMetadata.sermon_type || 'standard',
        topics: extractedMetadata.topics || [],
        tags: extractedMetadata.tags || [],
        summary: extractedMetadata.summary || 'No summary available',
        key_points: extractedMetadata.key_points || [],
        illustrations: extractedMetadata.illustrations || [],
        themes: extractedMetadata.themes || [],
        calls_to_action: extractedMetadata.calls_to_action || [],
        personal_stories: extractedMetadata.personal_stories || [],
        tone: extractedMetadata.tone || null,
        mentioned_people: extractedMetadata.mentioned_people || [],
        mentioned_events: extractedMetadata.mentioned_events || [],
        word_count: processingRecord.text.split(/\s+/).length,
        keywords: extractedMetadata.keywords || [],
        preacher: extractedMetadata.preacher || 'Unknown Preacher',
        location: extractedMetadata.location || null,
        
        // File info
        file_name: processingRecord.file_name,
        file_size: processingRecord.file_size,
        file_type: processingRecord.file_type,
        
        // References
        processing_id: processingRecord.id,
        user_id: processingRecord.user_id,
        
        // Confidence scores from AI
        confidence_scores: extractedMetadata.confidence_scores || {}
      })
      .select()
      .single();

    if (sermonError) {
      throw new Error(`Failed to create sermon record: ${sermonError.message}`);
    }

    // Update processing record
    await supabase
      .from('sermon_processing')
      .update({ 
        status: 'parsed',
        sermon_id: sermon.id
      })
      .eq('id', id);

    return NextResponse.json({ 
      processingId: id,
      sermonId: sermon.id,
      status: 'parsed',
      nextStep: 'vectorize'
    });

  } catch (error) {
    console.error('Parsing error:', error);
    
    if (processingRecord) {
      try {
        const supabase = createServerSupabaseClient();
        await supabase
          .from('sermon_processing')
          .update({ 
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Parsing failed'
          })
          .eq('id', id);
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

    return NextResponse.json({ 
      error: 'Failed to parse sermon',
      step: 'parse'
    }, { status: 500 });
  }
}
