import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_MEDIA_SIZE = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = verifyToken(token) as { id?: string; userId?: string } | null;
  const userId = payload?.id || payload?.userId;
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "GIF uploads are not configured yet. You can still send a built-in GIF." }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (kind !== "GIF" && kind !== "STICKER") {
      return NextResponse.json({ error: "Choose a GIF or sticker upload." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }
    if (!file.size || file.size > MAX_MEDIA_SIZE) {
      return NextResponse.json({ error: "Sticker and GIF files must be 4 MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const signature = bytes.subarray(0, 6).toString("ascii");
    const isGif = signature === "GIF87a" || signature === "GIF89a";
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    if (kind === "GIF" && !isGif) {
      return NextResponse.json({ error: "Choose a real animated GIF file." }, { status: 415 });
    }
    if (kind === "STICKER" && !(isGif || isPng || isJpeg || isWebp)) {
      return NextResponse.json({ error: "Sticker files must be GIF, PNG, JPG, or WEBP." }, { status: 415 });
    }

    const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: `mivo-capital/member-uploads/${userId}`, resource_type: "image" },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("GIF upload failed."));
            return;
          }
          resolve({ secure_url: result.secure_url });
        },
      );
      upload.end(bytes);
    });

    return NextResponse.json({ url: uploaded.secure_url });
  } catch (error) {
    console.error("CHAT GIF UPLOAD ERROR:", error);
    return NextResponse.json({ error: "Mivo could not upload that GIF. Please try again." }, { status: 503 });
  }
}
