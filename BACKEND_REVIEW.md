# Backend Review

This project already has a solid direction:

- `Prisma` is your data layer.
- `NextAuth` is your authentication layer.
- `app/api/*` contains route handlers.
- `lib/actions/*` contains server actions.
- `lib/queries/*` contains read-focused database helpers.

The main problem is not "you are bad at backend". The main problem is that parts of the codebase are moving in two different directions at once:

- one direction models products around `ProductVariant` + `Inventory`
- another direction still treats `Product` as if it owns `price` and `inventory`

That mismatch is why the backend feels confusing right now.

## Minimal improvement made

I updated `app/api/products/route.ts` so it now:

- validates incoming product data with `zod`
- accepts `title` and also tolerates `name`
- creates a schema-valid product
- defaults new products to `DRAFT`
- returns a clearer `400` for bad input

This is intentionally small and safe.

## Highest priority fixes

Fix these before doing bigger backend work.

### 1. Make the product model consistent everywhere

Your Prisma schema says:

- `Product` has `title`, `status`, `vendorId`
- `ProductVariant` has `price`
- `Inventory` belongs to `ProductVariant`

But some files still assume:

- `Product.price` exists
- `Product.inventory` exists

Files that need attention:

- `app/store/[slug]/page.tsx`
- `app/vendor/dashboard/page.tsx`
- `app/api/cart/add/route.ts`
- `app/services/checkout.ts`
- `prisma/seed.ts`

Simple rule:

- product-level info: title, status, vendor
- variant-level info: price, stock, SKU

### 2. Fix Prisma queries that use non-unique fields with `findUnique`

Some queries use `findUnique` with multiple fields that are not declared as a Prisma unique key.

Examples:

- `lib/actions/product.actions.ts`

Safer beginner rule:

- use `findUnique` only for `id`, `email`, or fields marked `@unique`
- use `findFirst` for ownership checks like `{ id, vendorId }`

### 3. Remove route duplication for variant updates

You currently have both:

- `app/api/products/[productId]/variants/route.ts`
- `app/api/products/[productId]/variants/[variantId]/route.ts`

The nested route is the clearer one for `PATCH` and `DELETE`.

Keep this mental model:

- collection route: `/variants` for `POST` or `GET`
- single-item route: `/variants/[variantId]` for `PATCH` and `DELETE`

### 4. Add validation before database writes

Some routes trust `req.json()` too much.

Good places to improve next:

- `app/api/auth/signup/route.ts`
- `app/api/cart/add/route.ts`
- `app/api/onboarding/complete/route.ts`
- `app/api/vendor/order-items/ship/route.ts`

Beginner-friendly pattern:

1. parse request body
2. validate with `zod`
3. return `400` if invalid
4. then do database work

## Recommended simple structure

Do not do a big refactor yet. Use this lightweight structure instead:

- `app/api/*`
  - only HTTP concerns: auth check, request parsing, response status
- `lib/validators/*`
  - `zod` schemas for request bodies
- `lib/services/*`
  - business logic and transactions
- `lib/queries/*`
  - read-only database queries for pages

That gives you separation without making the app too abstract.

## What to learn next

Learn these in this order:

### 1. Prisma basics

Focus on:

- relations
- `findUnique` vs `findFirst` vs `findMany`
- nested writes
- transactions

Why first:

- most of your current backend confusion comes from data-model mismatch

### 2. Request validation with `zod`

Focus on:

- required vs optional fields
- `safeParse`
- returning friendly validation errors

Why second:

- validation prevents buggy data from entering the database

### 3. Next.js route handlers

Focus on:

- `GET`, `POST`, `PATCH`, `DELETE`
- `params`
- `NextResponse`
- keeping handlers thin

### 4. Authentication and authorization

Focus on:

- `auth()`
- checking session user
- vendor ownership checks
- difference between "logged in" and "allowed"

### 5. Variant-based ecommerce modeling

Focus on:

- product vs variant responsibilities
- inventory per variant
- price snapshots in orders

This will make the rest of the codebase feel much more logical.

## Suggested next steps

Work in this order:

1. Fix every file that still expects `Product.price` or `Product.inventory`.
2. Fix the incorrect `findUnique` ownership queries in `lib/actions/product.actions.ts`.
3. Keep only one clear variant update/delete route path.
4. Add `zod` validation to signup, cart, and onboarding routes.
5. After that, run TypeScript and Prisma checks locally and clean up whatever remains.

## A good beginner mindset here

You do not need to "know backend" all at once.

A strong next move is simply:

- pick one data model
- make every file agree with it
- validate input before writing
- keep routes small

That is already real backend engineering.
