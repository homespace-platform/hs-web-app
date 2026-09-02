const gatewayUrl = "http://127.0.0.1:8080";

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const target = new URL(`/api/v1/${path.join("/")}`, gatewayUrl);
  target.search = new URL(request.url).search;
  const response = await fetch(target, { cache: "no-store" });
  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
    },
  });
}
