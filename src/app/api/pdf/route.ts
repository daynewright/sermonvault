import { createServerSupabaseClient } from '@/app/api/lib/clients/supabase';
import { NextResponse } from 'next/server';

export const GET = async (
  req: Request,
) => {
  const supabase = createServerSupabaseClient();
  
  // Get the path from URL search params
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json(
      { error: 'File path is required' },
      { status: 400 }
    )
  }

  try {
    // Get the signed URL for the PDF
    const { data, error: storageError } = await supabase
      .storage
      .from('sermons')
      .createSignedUrl(path, 60 * 60) // 1 hour expiry

    if (storageError) {
      return NextResponse.json(
        { error: 'Could not access PDF', details: storageError },
        { status: 500 }
      )
    }

    if (!data?.signedUrl) {
      return NextResponse.json(
        { error: 'No signed URL generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 