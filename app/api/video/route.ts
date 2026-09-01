import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawUrl = searchParams.get("v") || searchParams.get("url");

  if (!rawUrl) {
    return new NextResponse("Missing video source parameter", { status: 400 });
  }

  let targetUrl: string;
  try {
    // Decode base64 URL
    targetUrl = Buffer.from(rawUrl, "base64url").toString("utf-8");
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      // Fallback try standard base64
      targetUrl = Buffer.from(rawUrl, "base64").toString("utf-8");
    }
    new URL(targetUrl);
  } catch {
    return new NextResponse("Invalid video source", { status: 400 });
  }

  // Forward range header if present (for seeking in HTML5 video)
  const rangeHeader = request.headers.get("range");
  const fetchHeaders: HeadersInit = {};
  if (rangeHeader) {
    fetchHeaders["range"] = rangeHeader;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: fetchHeaders,
    });

    const responseHeaders = new Headers();
    const headersToForward = [
      "content-type",
      "content-range",
      "content-length",
      "accept-ranges",
      "last-modified",
      "etag",
    ];

    headersToForward.forEach((h) => {
      const val = upstreamRes.headers.get(h);
      if (val) {
        responseHeaders.set(h, val);
      }
    });

    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "video/mp4");
    }
    if (!responseHeaders.has("accept-ranges")) {
      responseHeaders.set("accept-ranges", "bytes");
    }

    // Cache control to optimize streaming
    responseHeaders.set("cache-control", "public, max-age=3600");

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Error proxying video stream:", err);
    return new NextResponse("Unable to stream video", { status: 502 });
  }
}
