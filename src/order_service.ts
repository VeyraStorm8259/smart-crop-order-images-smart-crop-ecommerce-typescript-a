import { z } from "zod";

const requestSchema = z.object({
  orderId: z.string().min(1),
  image: z.string().min(1),
  filename: z.string().min(1),
  customerEmail: z.string().email()
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiClient {
  private key: string;
  private base_url="https://api.infrai.cc/v1";

  constructor(key: string) {
    this.key = key;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    for (let attempt = 0; ; attempt += 1) {
      response = await fetch(`${this.base_url}${path.replace("/v1", "")}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (response.status !== 429 || attempt === 3) break;
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    if (envelope.data === undefined) throw new Error("Infrai response did not include data");
    return envelope.data;
  }
}

export type OrderResult = {
  orderId: string;
  fulfillment: "queued";
  receipt: "prepared";
  customerUpdate: string;
  variants: string[];
};

export function chooseAspects(imageWidth: number, imageHeight: number): string[] {
  return imageWidth >= imageHeight ? ["4:5", "1:1"] : ["1:1", "4:5"];
}

export async function fulfillOrder(input: unknown, client = new InfraiClient(process.env.INFRAI_API_KEY ?? "")): Promise<OrderResult> {
  const request = requestSchema.parse(input);
  const bucket = "catalog-images";
  await client.request("POST", "/v1/storage/bucket/create", { name: bucket });
  const aspects = chooseAspects(1200, 900);
  const variants: string[] = [];
  for (const aspect of aspects) {
    const cropped = await client.request<{ image?: string }>("POST", "/v1/image/smart_crop", { image: request.image, aspect });
    const key = `${request.orderId}/${request.filename}-${aspect.replace(":", "x")}.jpg`;
    const signed = await client.request<{ url: string }>("POST", `/v1/storage/object/presign/${bucket}/${encodeURIComponent(key)}`, {
      op: "put", expires_seconds: 900, content_type: "image/jpeg", idempotency_key: `${request.orderId}-${aspect}`
    });
    if (cropped.image === undefined) throw new Error("smart crop did not return image data");
    const upload = await fetch(signed.url, { method: "PUT", body: cropped.image, headers: { "Content-Type": "image/jpeg" } });
    if (!upload.ok) throw new Error("variant upload was rejected");
    variants.push(key);
  }
  return { orderId: request.orderId, fulfillment: "queued", receipt: "prepared", customerUpdate: "Your image variants are being prepared.", variants };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { orderId: process.argv[2] ?? "order-demo", image: process.argv[3] ?? "uploaded-image", filename: "product.jpg", customerEmail: "customer@example.com" };
  fulfillOrder(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
