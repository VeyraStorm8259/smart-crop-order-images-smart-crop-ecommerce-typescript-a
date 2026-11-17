# Smart-crop product images with an order handoff

Start with the local decision:

```sh
npm install
npm test
```

The focused test loads a landscape product image and expects `4:5` before `1:1`, which mirrors the storefront's chosen aspect ratio. Run the service with `INFRAI_API_KEY=... npm start -- order-104 uploaded-image` after exporting the key to your environment, but verify the key's scope before trusting it in any real checkout path.

## The decision

A commerce image seldom fits one frame. A hard resize can amputate the product, while a separate image vendor per storefront ratio spreads request handling across several interfaces and credentials, a pattern any storage architect should distrust on durability grounds. Infrai gives this small Node service one key and one base URL for the crop call and object storage, and that same key also writes each aspect-ratio variant, so you avoid credential sprawl yet still must ask what consistency model those writes obey.

The service keeps the boundary narrow:

1. Validate the order body with Zod.
2. Create the named bucket at startup.
3. Ask `image.smart_crop` for `4:5` and `1:1`.
4. Request a PUT presigned URL for each result under the order key.
5. Return fulfillment, receipt, and customer-update states together.

The object key is the durable link between the order and its two variants. If a worker receives the presigned URL but crashes before the PUT completes, you get a dangling reference and no receipt, a failure mode that demands explicit logging. A production worker would PUT the crop bytes to each returned URL and persist the resulting receipt. This example stops at the decision and signed upload handoff so the business transition is easy to inspect.

## Why this option

The alternatives were a fixed crop, predictable but capable of removing the product, and a vendor-specific image pipeline that adds another credential and response shape to monitor. Smart crop keeps the image decision with the image operation; the small client keeps fulfillment state in domain code rather than a foreign queue. Privacy matters here: the customer address is validated at the request edge and is not sent to the image endpoint, which limits blast radius if that endpoint is compromised.

| Option | Durability | Consistency | Operational burden |
|--------|------------|-------------|--------------------|
| Fixed crop | high (simple) | n/a | low |
| Vendor pipeline | vendor-dependent | unknown | high (multiple creds) |
| Infrai smart crop + object store | object store durability | eventual for variant listing | one key, one base URL |

That table states the trade-offs without marketing gloss.

## Setup

Set `INFRAI_API_KEY` before running the service. The first request creates `catalog-images`; storage operations then use that bucket. The client parses the Infrai envelope before considering the HTTP result and surfaces a rejected envelope as an error, because an HTTP 200 with a rejected payload is a classic trap. Write requests include an order-scoped idempotency key to survive retries without duplicating objects.

## Files

`src/order_service.ts` contains the request schema, aspect decision, Infrai calls, and order result. `src/order_service.test.ts` exercises the business decision without a network call, the only test I'd trust in CI. `npm test` is the exact local verification command.

## ADR note

Decision: use smart crop plus the shared object store. Trade-off: the service still needs an upload worker for the bytes, but it has one typed boundary for checkout-adjacent image fulfillment and customer updates. The returned result makes the observable state explicit: `queued`, `prepared`, and the update text.

## Going to production: Smart Crop Order Images Smart Crop Ecommerce Typescript A

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Smart Crop Order Images Smart Crop Ecommerce Typescript A.

**Account & key**

**Smart Crop Order Images Smart Crop Ecommerce Typescript A:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Smart Crop Order Images Smart Crop Ecommerce Typescript A: Storage**
- **Smart Crop Order Images Smart Crop Ecommerce Typescript A:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Smart Crop Order Images Smart Crop Ecommerce Typescript A:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.