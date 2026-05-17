import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp, parseBody, sanitize } from '@/lib/security';

export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit('voice-summary:' + ip, 30, 60000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  // Validate internal service token
  const token = request.headers.get('x-voice-service-token');
  if (!token || token !== process.env.VOICE_SERVICE_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Service token must declare which shop it's acting on; resource ownership
  // is re-verified so a leaked token can't pivot across tenants.
  const declaredShopId = request.headers.get('x-shop-id');
  if (!declaredShopId) {
    return NextResponse.json({ error: 'x-shop-id header required' }, { status: 400 });
  }

  const body = await parseBody(request, 20_000);
  if (!body) {
    return NextResponse.json({ error: 'Invalid or oversized payload' }, { status: 400 });
  }
  const { callSid, summary } = body;

  if (!callSid || typeof callSid !== 'string' || !summary || typeof summary !== 'string') {
    return NextResponse.json(
      { error: 'callSid and summary required' },
      { status: 400 }
    );
  }

  const cleanCallSid = sanitize(callSid, 100);
  const cleanSummary = sanitize(summary, 5000);
  if (!cleanCallSid || !cleanSummary) {
    return NextResponse.json({ error: 'Invalid callSid or summary' }, { status: 400 });
  }

  // Update the VoiceCall record with the summary — scoped to declared shop
  const updated = await prisma.voiceCall.updateMany({
    where: { callSid: cleanCallSid, clinicId: declaredShopId },
    data: { summary: cleanSummary },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: 'VoiceCall not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
