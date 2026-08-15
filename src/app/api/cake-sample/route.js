import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { CAKE_SAMPLE_API_PREFIX } from "@/lib/cake-sample";
import { cakeSampleStorageDirs } from "@/lib/cake-sample-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function requestOrigin(request) {
  const xfProto = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  const xfHost = (request.headers.get("x-forwarded-host") || "").split(",")[0].trim();
  if (xfHost) return `${xfProto || "https"}://${xfHost}`.replace(/\/$/, "");
  try {
    return new URL(request.url).origin;
  } catch {
    return (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
  }
}

/**
 * Public cake sample upload for bakery custom orders.
 * Saves under data/cake-samples and returns a same-origin /api/cake-sample URL.
 */
export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Image file is required." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { message: "Use JPEG, PNG, or WebP for the sample image." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { message: "Sample image must be 2 MB or less after compression." },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const id = randomBytes(12).toString("hex");
    const filename = `${id}.jpg`;
    const primaryDir = cakeSampleStorageDirs()[0];
    await mkdir(primaryDir, { recursive: true });
    await writeFile(path.join(primaryDir, filename), buf);

    const relativeUrl = `${CAKE_SAMPLE_API_PREFIX}/${filename}`;
    const absoluteUrl = `${requestOrigin(request)}${relativeUrl}`;
    return NextResponse.json({
      url: absoluteUrl,
      relative_url: relativeUrl,
      full_url: absoluteUrl,
      filename,
    });
  } catch (err) {
    console.error("cake-sample upload failed", err);
    return NextResponse.json(
      { message: err?.message || "Could not upload sample image." },
      { status: 500 }
    );
  }
}
