---
name: trellio-api
description: "Build Next.js API route handlers for Trellio following RESTful conventions, validation, error handling, and auth patterns. Use when: creating endpoints, building API routes, adding server actions, handling form submissions, integrating with Prisma, or any backend logic. Triggers include: 'create an endpoint', 'add an API route', 'build the backend for', 'server action', 'handle form submission', or requests involving data CRUD, authentication, or third-party integrations."
---

# Trellio API Endpoint Builder

## Overview

Build secure, consistent API endpoints for Trellio's field service platform. All endpoints handle jobs, clients, invoices, scheduling, crew management, and payments for home service businesses.

## Tech Stack

- **Runtime:** Next.js 14+ App Router (Route Handlers + Server Actions)
- **ORM:** Prisma with PostgreSQL
- **Validation:** Zod
- **Auth:** NextAuth.js v5 (Auth.js)
- **Language:** TypeScript (strict)

## File Structure

```
src/
├── app/
│   └── api/
│       ├── jobs/
│       │   ├── route.ts              # GET (list), POST (create)
│       │   └── [jobId]/
│       │       ├── route.ts          # GET, PATCH, DELETE single job
│       │       ├── assign/route.ts   # POST assign crew
│       │       └── complete/route.ts # POST mark complete
│       ├── clients/
│       │   ├── route.ts
│       │   └── [clientId]/route.ts
│       ├── invoices/
│       │   ├── route.ts
│       │   └── [invoiceId]/route.ts
│       ├── schedule/
│       │   └── route.ts
│       └── webhooks/
│           ├── stripe/route.ts
│           └── twilio/route.ts
├── lib/
│   ├── api/
│   │   ├── errors.ts         # Standardized error classes
│   │   ├── response.ts       # Response helpers
│   │   └── middleware.ts      # Auth, rate limiting, logging
│   ├── validations/
│   │   ├── job.ts             # Zod schemas for jobs
│   │   ├── client.ts
│   │   └── invoice.ts
│   └── services/
│       ├── job.service.ts     # Business logic layer
│       ├── client.service.ts
│       └── invoice.service.ts
└── server/
    └── actions/               # Server Actions for forms
        ├── job-actions.ts
        ├── client-actions.ts
        └── invoice-actions.ts
```

## Route Handler Template

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/api/response";

// Define Zod schema at the top of the file
const createResourceSchema = z.object({
  name: z.string().min(1).max(255),
  // ... fields
});

// GET /api/[resource] — List with pagination & filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const where = {
      organizationId: session.user.organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.resource.count({ where }),
    ]);

    return apiResponse({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/resource]", error);
    return apiError("Internal server error", 500);
  }
}

// POST /api/[resource] — Create
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const validated = createResourceSchema.safeParse(body);

    if (!validated.success) {
      return apiError("Validation failed", 422, validated.error.flatten());
    }

    const item = await prisma.resource.create({
      data: {
        ...validated.data,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
      },
    });

    return apiResponse({ data: item }, 201);
  } catch (error) {
    console.error("[POST /api/resource]", error);
    return apiError("Internal server error", 500);
  }
}
```

## Response Helpers

Always use these — never construct raw NextResponse in route handlers:

```typescript
// src/lib/api/response.ts
import { NextResponse } from "next/server";

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}

export function apiError(
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: { message, ...(details && { details }) },
    },
    { status }
  );
}
```

## Error Status Codes

| Code | When to Use |
|------|-------------|
| 200 | Successful GET, PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE (no content) |
| 400 | Malformed request body or params |
| 401 | No session / not authenticated |
| 403 | Authenticated but wrong organization / no permission |
| 404 | Resource not found (within user's org scope) |
| 409 | Conflict (duplicate, scheduling overlap) |
| 422 | Zod validation failed |
| 429 | Rate limited |
| 500 | Unexpected server error |

## Server Actions Template

Use for form submissions in the dashboard:

```typescript
// src/server/actions/job-actions.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createJobSchema = z.object({
  title: z.string().min(1, "Job title is required").max(255),
  clientId: z.string().cuid(),
  scheduledDate: z.string().datetime(),
  estimatedDuration: z.number().min(15).max(480), // minutes
  notes: z.string().max(2000).optional(),
});

export type CreateJobState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createJob(
  _prevState: CreateJobState,
  formData: FormData
): Promise<CreateJobState> {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { success: false, error: "Unauthorized" };
  }

  const raw = Object.fromEntries(formData);
  const validated = createJobSchema.safeParse({
    ...raw,
    estimatedDuration: Number(raw.estimatedDuration),
  });

  if (!validated.success) {
    return {
      success: false,
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.job.create({
      data: {
        ...validated.data,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
        status: "SCHEDULED",
      },
    });

    revalidatePath("/dashboard/jobs");
    return { success: true };
  } catch (error) {
    console.error("[createJob]", error);
    return { success: false, error: "Failed to create job. Please try again." };
  }
}
```

## Rules

### Security
- **Always check auth first** — every handler starts with `const session = await auth()`
- **Always scope to organization** — every query includes `organizationId` from session
- **Never trust client input** — validate everything with Zod before touching the database
- **Sanitize search queries** — use Prisma's built-in parameterized queries (never raw SQL with user input)
- **Webhook routes:** Verify signatures (Stripe: `stripe.webhooks.constructEvent`)

### Architecture
- **Route Handlers** for external API / AJAX calls
- **Server Actions** for form submissions within the dashboard
- **Service layer** (`lib/services/`) for complex business logic shared between routes and actions
- **Keep route handlers thin** — validation → service call → response
- **One Zod schema per operation** (create, update, filter) — keep in `lib/validations/`

### Pagination & Filtering
- Default 20 items per page, max 100
- Always return `{ data, pagination: { page, limit, total, totalPages } }`
- Support `?search=`, `?status=`, `?sort=`, `?page=`, `?limit=`

### Multi-tenancy
- Trellio is multi-tenant — every query MUST include `organizationId`
- Never expose data across organizations
- Use `session.user.organizationId` — never accept orgId from client

### Naming
- **Route files:** `route.ts` in appropriate directory
- **Schemas:** `createJobSchema`, `updateJobSchema`, `jobFilterSchema`
- **Services:** `job.service.ts` → `export const jobService = { create, update, list, ... }`
- **Actions:** `job-actions.ts` → `export async function createJob(...)`

### Do NOT
- Return raw Prisma errors to the client
- Use `any` — type all function parameters and returns
- Skip validation — even "simple" endpoints need Zod
- Forget pagination on list endpoints
- Build complex logic directly in route handlers — extract to services
- Use raw SQL unless absolutely necessary (Prisma handles 99% of cases)

## Checklist Before Finishing

- [ ] Auth check at the top of every handler
- [ ] Organization scoping on every database query
- [ ] Zod validation on all input (body, params, searchParams)
- [ ] Proper error status codes and messages
- [ ] Pagination on list endpoints
- [ ] `try/catch` with `console.error` and generic error response
- [ ] TypeScript types — no `any`, return types on functions
- [ ] `revalidatePath` called in Server Actions after mutations
