import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/*", "video/*"],
        addRandomSuffix: true,
        maximumSizeInBytes: 200 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {
        // Handled client-side via the recordUpload server action instead,
        // since this callback never fires against localhost.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
