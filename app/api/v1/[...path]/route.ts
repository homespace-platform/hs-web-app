const gatewayUrl = "http://127.0.0.1:8080";

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST",
) {
  const { path } = await context.params;
  const target = new URL(`/api/v1/${path.join("/")}`, gatewayUrl);
  target.search = new URL(request.url).search;
  const response = await fetch(target, { method, cache: "no-store" });
  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
    },
  });
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
