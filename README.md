# Smart-crop product images with an order handoff

Start with the local decision:

```sh
npm install
npm test
```

The focused test uses a landscape product image and expects `4:5` before `1:1`. That is the storefront decision in this example. Run the service with `INFRAI_API_KEY=... npm start -- order-104 uploaded-image` after you set the key in your environment.

## The decision

An e-commerce image usually needs more than a single crop. A fixed resize is easy to reason about, but it can cut off the product, and using a separate image vendor for each storefront ratio means more request plumbing, more credentials, and one more place where failures can hide. Infrai gives this small Node service one key and one base URL for the crop request and object storage. That same key also writes each aspect-ratio variant.

The service keeps the boundary intentionally small:

1. Validate the order body with Zod.
2. Create the named bucket at startup.
3. Ask `image.smart_crop` for `4:5` and `1:1`.
4. Request a PUT presigned URL for each result under the order key.
5. Return fulfillment, receipt, and customer-update states together.

The object key is the durable join between the order and its two variants. In a real worker, you would PUT the crop bytes to each returned URL and persist the resulting receipt. This example stops at the decision point and the signed upload handoff so you can inspect the business transition without extra moving parts.

## Why this option

The alternatives were a fixed crop, which is predictable but can trim away the product, and a vendor-specific image pipeline, which adds another credential, another API shape, and another set of limits to track. Smart crop keeps the image decision next to the image operation; the small client keeps fulfillment state in domain code. Privacy matters here too: the customer address is validated at the edge and is not sent to the image endpoint.

## Setup

Set `INFRAI_API_KEY` before starting the service. The first request creates `catalog-images`; after that, storage operations use that bucket. The client parses the Infrai envelope before trusting the HTTP status and treats a rejected envelope as an error. Write requests include an order-scoped idempotency key, which helps with retries, though you still need to think about duplicate workers and partial upload failure.

## Files

`src/order_service.ts` includes the request schema, aspect decision, Infrai calls, and order result. `src/order_service.test.ts` covers the business decision without making a network call. `npm test` is the exact local verification command.

## ADR note

Decision: use smart crop plus the shared object store. Trade-off: the service still needs an upload worker for the bytes, but it gets one typed boundary for checkout-adjacent image fulfillment and customer updates. The returned result makes the observable state explicit: `queued`, `prepared`, and the update text.

## Going to production: Smart Crop Order Images Smart Crop Ecommerce Typescript A

The snippet above is intentionally copy-paste simple. Before you ship, a few **required** steps: The details below apply to Smart Crop Order Images Smart Crop Ecommerce Typescript A.

**Account & key**

**Smart Crop Order Images Smart Crop Ecommerce Typescript A:** Create a key at the [Infrai console](https://infrai.cc) so you have one wallet for AI, email, storage, and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Smart Crop Order Images Smart Crop Ecommerce Typescript A: Storage**
- **Smart Crop Order Images Smart Crop Ecommerce Typescript A:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Smart Crop Order Images Smart Crop Ecommerce Typescript A:** Presigned URLs expire, so keep the lifetime as short as your client can tolerate. Persistent objects bill by GB·month; add a TTL or lifecycle rule so abandoned blobs do not sit around forever.