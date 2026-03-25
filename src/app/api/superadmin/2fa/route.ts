import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";
import { rateLimit, sanitize, isValidEmail } from "@/lib/security";
import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import { logger } from "@/lib/logger";

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function sendOTPEmail(to: string, code: string) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY not set");
  sgMail.setApiKey(key);

  await sgMail.send({
    to,
    from: { email: process.env.EMAIL_FROM || "info@queueup.me", name: process.env.EMAIL_FROM_NAME || "QueueUp" },
    subject: "Your QueueUp login code",
    text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9;">
        <h2 style="color: #111; margin-bottom: 8px;">Your login code</h2>
        <p style="color: #555; margin-bottom: 24px;">Use this code to complete your QueueUp superadmin login:</p>
        <div style="background: #111; color: #fff; font-size: 32px; font-weight: 700; letter-spacing: 0.3em; text-align: center; padding: 20px; border-radius: 10px; margin-bottom: 24px;">${code}</div>
        <p style="color: #888; font-size: 13px;">This code expires in 5 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

// POST - handle 2FA flow
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("superadmin-2fa:" + ip, 10, 900000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const body = await request.json();
  const { step } = body;

  if (step === "login") {
    const email = sanitize(body.email || "", 200).toLowerCase();
    const password = body.password;
    if (!email || !isValidEmail(email)) return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    if (!password || typeof password !== "string") return NextResponse.json({ error: "Password required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, role: true },
    });

    if (!user || user.role !== "superadmin") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate OTP and store it (reuse totpSecret field for OTP:expiry)
    const otp = generateCode();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: `${otp}:${expiry.toISOString()}` },
    });

    try {
      await sendOTPEmail(user.email, otp);
    } catch (error) {
      logger.error("Failed to send OTP email", "api:superadmin", error);
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
    }

    return NextResponse.json({ requires2FA: true, userId: user.id });
  }

  if (step === "verify") {
    const { userId, code } = body;
    if (!userId || typeof userId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, totpSecret: true },
    });

    if (!user || user.role !== "superadmin" || !user.totpSecret) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const [storedCode, expiryStr] = user.totpSecret.split(":");
    const expiry = new Date(expiryStr);

    if (new Date() > expiry) {
      return NextResponse.json({ error: "Code expired. Please log in again." }, { status: 401 });
    }

    if (code !== storedCode) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    // Clear the OTP
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null },
    });

    const token = createToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ success: true });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}
