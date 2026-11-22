async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST",
) {
  const { path } = await context.params;
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL;
  if (!gatewayUrl) {
    return Response.json({ message: "Gateway URL is not configured." }, { status: 502 });
  }

  try {
    const target = new URL(`/api/v1/${path.join("/")}`, gatewayUrl);
    target.search = new URL(request.url).search;
    const response = await fetch(target, { method, cache: "no-store" });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return Response.json({ message: "Gateway is unavailable." }, { status: 502 });
  }
}

export function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, context, "GET");
}

export function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, context, "POST");
}
