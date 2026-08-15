import { readFile, unlink, access } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getMyRestaurants } from "@/lib/api";
import { isSafeCakeSampleFilename } from "@/lib/cake-sample";
import { cakeSampleStorageDirs } from "@/lib/cake-sample-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function resolveExistingFile(filename) {
  for (const dir of cakeSampleStorageDirs()) {
    const full = path.join(dir, filename);
    try {
      await access(full);
      return full;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function assertOwnerToken(token) {
  if (!token) return false;
  try {
    await getMyRestaurants(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Serve a cake sample image from disk (same Next server that received the upload).
 */
export async function GET(_request, context) {
  const filename = String((await context.params)?.filename || "").trim().toLowerCase();
  if (!isSafeCakeSampleFilename(filename)) {
    return NextResponse.json({ message: "Invalid file." }, { status: 400 });
  }
  const full = await resolveExistingFile(filename);
  if (!full) {
    return NextResponse.json({ message: "Sample image not found." }, { status: 404 });
  }
  const buf = await readFile(full);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

/**
 * Delete sample file after cake order is finished. Does not touch order history.
 */
export async function DELETE(request, context) {
  const token = bearerToken(request);
  if (!(await assertOwnerToken(token))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const filename = String((await context.params)?.filename || "").trim().toLowerCase();
  if (!isSafeCakeSampleFilename(filename)) {
    return NextResponse.json({ message: "Invalid file." }, { status: 400 });
  }
  let deleted = false;
  for (const dir of cakeSampleStorageDirs()) {
    const full = path.join(dir, filename);
    try {
      await unlink(full);
      deleted = true;
    } catch {
      /* missing in this dir */
    }
  }
  return NextResponse.json({ ok: true, deleted });
}
