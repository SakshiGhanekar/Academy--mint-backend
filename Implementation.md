Implementation
==============

This document captures the implementation details added to the project for dashboard analytics (product trends and visitor logs), the schema changes, API endpoints, sample responses, seeding instructions, and optional features attempted.

1. Your approach
-----------------

- Goal: Add lightweight analytics to support dashboard views for product trends and visitor activity without changing existing product/order models.
- Strategy:
  - Add two new Prisma models to store time-series/per-visit data: `ProductTrend` and `VisitorLog`.
  - Provide server-side controller functions that aggregate those models into bucketed (day/week/month) statistics for dashboard consumption.
  - Add a seed script to populate representative sample data for both models so the dashboard UI can show realistic data during development.
  - Keep the integration minimal: don't modify existing Product/Order behavior, only append analytics records when relevant (this repo currently seeds and reads the new models; instrumentation hooks would be the next step).

2. Schema changes
------------------

Files changed/added:
- `server/prisma/schema.prisma` (new models added at bottom of file)

New models introduced (summary):

- ProductTrend
  - Fields:
    - `id: String @id @default(uuid())`
    - `productId: String` — foreign reference to product identifier (no enforced DB-level relation; this is a lightweight store keyed by product id)
    - `date: DateTime @default(now())` — when the trend row represents
    - `views: Int @default(0)` — number of views in that bucket/day
    - `purchases: Int @default(0)` — purchases in that bucket/day
  - Indexes: `@@index([productId])` and `@@index([date])` for faster range queries.

- VisitorLog
  - Fields:
    - `id: String @id @default(uuid())`
    - `sessionId: String?`
    - `ip: String?`
    - `userAgent: String?`
    - `path: String?`
    - `country: String?`
    - `createdAt: DateTime @default(now())`
  - Indexes: `@@index([createdAt])` to efficiently query recent visitors.

Rationale and notes:
- I intentionally kept `productId` on `ProductTrend` as a plain string (not a foreign key) to avoid cascading complexity and keep analytics decoupled from the primary product lifecycle — this is acceptable for many analytics stores. If stronger referential integrity is required, convert `productId` to a proper relation field referencing `Product.id`.
- `VisitorLog` is a simple append-only table for audit/analytics. It intentionally stores basic request metadata to avoid collecting PII beyond IP and session id. Review privacy/regulatory requirements before collecting more.

3. API details
---------------

Controller: `server/controllers/dashboardController.js`

Two endpoints (controller functions) are provided and expected to be wired up in the server routes:

- GET /dashboard/products
  - Query parameters:
    - `startDate` — ISO date (YYYY-MM-DD), defaults to `2025-09-01` in controller when missing.
    - `endDate` — ISO date (YYYY-MM-DD), defaults to `2025-09-07` in controller when missing.
    - `bucket` — `day` | `week` | `month` to control aggregation interval. Defaults to `day`.
  - Behavior:
    - Builds contiguous buckets between `startDate` and `endDate` using the bucket size.
    - For each bucket, queries `ProductTrend` rows whose `date` falls within the bucket range and returns counts:
      - `totalProducts` (number of trend rows in the period)
      - `productsAdded` (same as totalProducts in current simple implementation)
      - `productsRemoved` (placeholder, set to 0 because delete tracking isn't implemented)
    - Returns `currentTotal` (the total number of `Product` records in DB) and the `trend` array of bucket objects.
  - Sample request:

    GET /dashboard/products?startDate=2025-09-01&endDate=2025-09-07&bucket=day

  - Sample response (HTTP 200):

    {
      "currentTotal": 123,
      "trend": [
        {
          "startDate": "2025-09-01",
          "endDate": "2025-09-01",
          "totalProducts": 3,
          "productsAdded": 3,
          "productsRemoved": 0
        },
        {
          "startDate": "2025-09-02",
          "endDate": "2025-09-02",
          "totalProducts": 5,
          "productsAdded": 5,
          "productsRemoved": 0
        }
      ]
    }

- GET /dashboard/visitors
  - Query parameters: same as `/dashboard/products` (`startDate`, `endDate`, `bucket`)
  - Behavior:
    - Returns `totalVisitors` (count of all `VisitorLog` records) and `visitorsByBucket` (array of bucket summaries with `visitors` count for each bucket).
  - Sample request:

    GET /dashboard/visitors?startDate=2025-09-01&endDate=2025-09-07&bucket=day

  - Sample response (HTTP 200):

    {
      "totalVisitors": 200,
      "visitorsByBucket": [
        { "startDate": "2025-09-01", "endDate": "2025-09-01", "visitors": 10 },
        { "startDate": "2025-09-02", "endDate": "2025-09-02", "visitors": 15 }
      ]
    }

Error handling:
- Both controllers return HTTP 500 with a JSON error message on unexpected failures. Example:

  HTTP 500
  { "error": "Error building product dashboard" }

Notes about wiring routes:
- The controllers export `dashboardProducts` and `dashboardVisitors`. The server's router file(s) should map HTTP routes to these handlers (e.g., `GET /dashboard/products` -> `dashboardProducts`). Search the repo for existing route wiring conventions (Express style or custom) and add routes accordingly.

4. Seed / sample data
----------------------

File: `server/seed.js`

- Purpose: Provide representative sample documents for `ProductTrend` and `VisitorLog` so the dashboard endpoints have data during development.
- Usage:

  - Ensure `DATABASE_URL` is set to a writable database.
  - Run the seed script from project root (Node/Prisma):

    ```powershell
    node server/seed.js
    ```

  - The script will create multiple `ProductTrend` rows and `VisitorLog` rows and log a confirmation message.

Notes:
- The seed script uses `prisma.productTrend.createMany` and `prisma.visitorLog.createMany`. If your database already has rows with the same unique constraints (none here) or you run repeatedly, you may end up with duplicate data; delete or reset the tables if needed between runs.

5. Optional features attempted
------------------------------

- Bucketed aggregation helper (`buildBuckets`) is implemented to allow day/week/month grouping. It's intentionally simple and deterministic (inclusive ranges) and suitable for small-to-moderate datasets.
- Placeholder for `productsRemoved` is present — removal tracking would require a dedicated audit table or soft-delete timestamps on `Product` plus additional logic to compute removals per bucket.
- Privacy note: `VisitorLog` intentionally stores minimal metadata. If a GDPR/CCPA compliance flow is needed, add a retention policy and an API to purge or anonymize logs.

6. Edge cases and considerations
--------------------------------

- Empty ranges: If no data exists in the requested range, the endpoint returns buckets with zero counts. UI should handle empty arrays gracefully.
- Very large ranges: The `bucket=month` option currently uses a fixed 30-day month approximation. For long ranges, consider paginating or increasing aggregation performance with grouped DB queries instead of iterating buckets in JS.
- Timezones: The current implementation uses naive `Date` parsing and ISO date strings. If your users operate across timezones, align on UTC or pass explicit timezone offsets.

7. How to run / dev notes
--------------------------

1. Install dependencies (if not already):

   ```powershell
   npm install
   ```

2. Ensure your `.env` or environment contains `DATABASE_URL` pointing to your MySQL database used by Prisma.

3. Generate/Apply Prisma migrations (if you've added the models to `schema.prisma` but not yet migrated):

   ```powershell
   npx prisma migrate dev --name add-dashboard-models
   npx prisma generate
   ```

4. Seed sample data:

   ```powershell
   node server/seed.js
   ```

5. Start the server (follow the repo's existing start script — e.g., `npm run dev` or Next.js dev server) and navigate to the dashboard UI that consumes the endpoints or call them directly via curl/Postman.

8. Implementation status mapping
--------------------------------

- Approach: Done
- Schema changes (ProductTrend, VisitorLog): Done (see `server/prisma/schema.prisma`)
- Seed script: Done (`server/seed.js`)
- API controllers: Done (`server/controllers/dashboardController.js`) — endpoints should be wired in router files if not already.
- Optional features attempted: Noted (bucket helper, placeholder for removals)

9. Next steps / recommended improvements
--------------------------------------

- Wire the controller functions to explicit HTTP routes if missing (e.g., in `server/routes` or your Express/Nest/Fastify setup).
- Improve aggregation performance by pushing counts to DB (group-by queries) if dataset grows.
- Add referential integrity for `productId` in `ProductTrend` if desired.
- Add retention policy and purge/anonymization flows for `VisitorLog` for privacy compliance.
- Expose endpoint(s) for deleting/archiving old analytics data or to return top-N products by views/purchases.

If you want, I can also:
- Wire the routes for you (create or edit the server's route files) and add small unit tests for the controller functions.
- Convert `ProductTrend.productId` to a true foreign key relation and update the seed script accordingly.

---

Document created on 2025-09-13.
