import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// GET /api/qr/apk-download/[memberId]
// Generate QR code for member APK download
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    // Construct APK download URL
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://kas-app.com";
    const downloadUrl = `${baseUrl}/api/download/apk/${memberId}`;

    // Generate QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(downloadUrl, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      width: 300,
    });

    // Return as image
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
