import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// GET /api/download/apk/[memberId]
// Download APK file for a specific member
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    // Path to the APK file
    // Place your built APK in: public/downloads/kas-tracker.apk
    const apkPath = join(process.cwd(), "public", "downloads", "kas-tracker.apk");

    // Check if APK exists
    if (!existsSync(apkPath)) {
      return NextResponse.json(
        {
          error: "APK not available",
          message:
            "The app is not ready for download yet. Build the APK first and place it in public/downloads/kas-tracker.apk",
        },
        { status: 503 }
      );
    }

    // Read the APK file
    const apkBuffer = readFileSync(apkPath);

    // Return APK with proper headers
    return new NextResponse(apkBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="kas-tracker-${memberId}.apk"`,
        "Content-Length": apkBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("APK download error:", error);
    return NextResponse.json(
      { error: "Failed to download APK" },
      { status: 500 }
    );
  }
}
