import { generateDescription, validateRequest } from "@/lib/server/listing-description/generator";
import type { ListingDescriptionRequest } from "@/types/listing-description.type";

const MAX_BODY_LENGTH = 50_000;
// Simulated "thinking" so web and mobile behave the same until a real AI call replaces the templates.
const THINKING_MS = 5000;

const reject = (message: string) => Response.json({ message }, { status: 400 });

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_LENGTH) return reject("Dữ liệu gửi lên quá lớn.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reject("Dữ liệu gửi lên không hợp lệ.");
  }
  const error = validateRequest(body);
  if (error) return reject(error);
  await new Promise((resolve) => setTimeout(resolve, THINKING_MS));
  return Response.json(generateDescription(body as ListingDescriptionRequest));
}
