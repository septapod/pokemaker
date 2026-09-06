/**
 * Store an image and return its public URL.
 *
 * Replaces `uploadImage`, which wrote to the Supabase Storage bucket that was
 * deleted along with the project. Artwork now lives in Vercel Blob, which is
 * the pattern used across the rest of Brent's projects.
 *
 * Accepts either a data URL / base64 payload (what the drawing upload and the
 * image generator produce) or a remote URL to copy in, which is how a freshly
 * generated OpenAI image gets a permanent home.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { requireUser } from "./_lib/auth.js";

export const config = {
  api: {
    // Generated artwork runs a few hundred KB; a photographed drawing can be
    // larger. The default 1MB body limit is too small.
    bodyParser: { sizeLimit: "12mb" },
  },
};

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export default requireUser(async (req: VercelRequest, res: VercelResponse, user) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Fail loudly and specifically. A silent failure here would look like the
    // image generator being broken.
    console.error("BLOB_READ_WRITE_TOKEN is not set");
    res.status(503).json({
      error: "Image storage is not configured yet. Connect the pokemaker-art Blob store to this project.",
    });
    return;
  }

  try {
    const { dataUrl, sourceUrl, filename } = (req.body ?? {}) as Record<string, string>;

    let body: Buffer;
    let contentType = "image/png";

    if (typeof dataUrl === "string" && dataUrl) {
      const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
      if (match) {
        contentType = match[1];
        body = Buffer.from(match[2], "base64");
      } else {
        body = Buffer.from(dataUrl, "base64");
      }
    } else if (typeof sourceUrl === "string" && sourceUrl) {
      const upstream = await fetch(sourceUrl);
      if (!upstream.ok) {
        res.status(400).json({ error: "Could not read that image" });
        return;
      }
      contentType = upstream.headers.get("content-type") ?? contentType;
      body = Buffer.from(await upstream.arrayBuffer());
    } else {
      res.status(400).json({ error: "Send either dataUrl or sourceUrl" });
      return;
    }

    const extension = EXTENSIONS[contentType] ?? "png";
    const safeName = (filename ?? "creature").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    const key = `${user.id}/${Date.now()}-${safeName}.${extension}`;

    const blob = await put(key, body, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });

    res.status(200).json({ url: blob.url });
  } catch (error: any) {
    console.error("upload error:", error?.message);
    res.status(500).json({ error: "Could not save that image" });
  }
});
