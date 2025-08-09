import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('URL is required', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return new NextResponse(`Failed to fetch image. Status: ${response.status}`, { status: response.status });
    }
    
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="download"`,
      },
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
