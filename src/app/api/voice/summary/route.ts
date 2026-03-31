import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  // Validate internal service token
  const token = request.headers.get('x-voice-service-token');
  if (!token || token !== process.env.VOICE_SERVICE_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { callSid, summary } = body;

  if (!callSid || !summary) {
    return NextResponse.json(
      { error: 'callSid and summary required' },
      { status: 400 }
    );
  }

  // Update the VoiceCall record with the summary
  const updated = await prisma.voiceCall.updateMany({
    where: { callSid },
    data: { summary },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: 'VoiceCall not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
