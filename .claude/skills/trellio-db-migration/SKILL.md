---
name: trellio-db-migration
description: "Create and manage Prisma database schemas, models, migrations, and seed data for Trellio. Use when: adding database tables, creating models, modifying schema, writing migrations, setting up relationships, adding indexes, creating seed data, or any database structure work. Triggers include: 'add a table', 'create a model', 'database schema', 'migration', 'prisma', 'add a field', 'relationship between', 'seed data', or requests about data modeling for jobs, clients, invoices, schedules, or crew."
---

# Trellio Database Migration Builder

## Overview

Manage Prisma schema and migrations for Trellio — a multi-tenant field service management platform. The database handles jobs, clients, invoices, scheduling, crew management, payments, and business analytics for home service companies.

## Tech Stack

- **ORM:** Prisma 5+
- **Database:** PostgreSQL 15+
- **Schema file:** `prisma/schema.prisma`
- **Seed file:** `prisma/seed.ts`

## Commands Reference

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create migration (development)
npx prisma migrate dev --name descriptive-migration-name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only — destroys data)
npx prisma migrate reset

# Seed database
npx prisma db seed

# View database in browser
npx prisma studio
```

## Multi-Tenancy Model

Trellio is **multi-tenant by organization**. This is the most critical architectural decision in the schema.

```prisma
// EVERY business-data model MUST include this:
model Job {
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Add composite index for tenant-scoped queries:
  @@index([organizationId, status])
  @@index([organizationId, scheduledDate])
}
```

**Rules:**
- Every model that stores business data MUST have `organizationId`
- Every query MUST filter by `organizationId`
- System-level models (User, Organization, Subscription) are exceptions
- Use `onDelete: Cascade` from Organization so deleting an org cleans up everything

## Core Schema Structure

This is the foundational schema. When adding new models, follow these patterns:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// SYSTEM MODELS (no organizationId)
// ============================================================

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  name           String
  hashedPassword String?
  avatarUrl      String?
  role           UserRole @default(MEMBER)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  createdJobs    Job[]         @relation("CreatedBy")
  assignedJobs   JobAssignment[]

  @@index([organizationId])
  @@index([email])
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  phone     String?
  email     String?
  address   String?
  timezone  String   @default("America/New_York")
  logoUrl   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  users    User[]
  clients  Client[]
  jobs     Job[]
  invoices Invoice[]
  services ServiceType[]

  @@index([slug])
}

// ============================================================
// BUSINESS MODELS (always include organizationId)
// ============================================================

model Client {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  email     String?
  phone     String
  company   String?
  address   String?
  city      String?
  state     String?
  zip       String?
  notes     String?
  tags      String[] @default([])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Tenant
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Relations
  jobs     Job[]
  invoices Invoice[]

  @@index([organizationId, lastName])
  @@index([organizationId, email])
  @@index([organizationId, phone])
}
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Models | PascalCase, singular | `Job`, `Client`, `Invoice` |
| Fields | camelCase | `scheduledDate`, `lineItems` |
| Enums | PascalCase name, SCREAMING_SNAKE values | `enum JobStatus { SCHEDULED, IN_PROGRESS }` |
| Relations | Descriptive, camelCase | `createdBy`, `assignedJobs` |
| Indexes | Composite: `[organizationId, ...]` first | `@@index([organizationId, status])` |
| Migration names | kebab-case, descriptive | `add-job-scheduling-fields` |
| Join tables | Both names, alphabetical | `JobAssignment` (not `AssignedJob`) |

## Field Patterns

### Standard Timestamps (on EVERY model)
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Soft Delete (for business-critical data)
```prisma
deletedAt DateTime?
isActive  Boolean  @default(true)

@@index([organizationId, isActive])
```

### Money Fields
```prisma
// ALWAYS store money as integers (cents) — never Float or Decimal for currency
amount      Int    // $150.00 = 15000
taxRate     Int    @default(0)  // 8.5% = 850 (basis points)
taxAmount   Int    @default(0)  // calculated cents
totalAmount Int    // amount + taxAmount
currency    String @default("USD")
```

### Status Enums
```prisma
enum JobStatus {
  DRAFT
  SCHEDULED
  DISPATCHED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PAID
  OVERDUE
  VOID
}

enum PaymentMethod {
  CASH
  CHECK
  CARD
  BANK_TRANSFER
  OTHER
}
```

### Address (Embedded Pattern)
```prisma
// Since Prisma doesn't support embedded objects, use prefixed fields:
address     String?
city        String?
state       String?
zip         String?
latitude    Float?
longitude   Float?

// Or for models that need multiple addresses:
model Address {
  id     String      @id @default(cuid())
  type   AddressType @default(SERVICE)
  line1  String
  line2  String?
  city   String
  state  String
  zip    String
  lat    Float?
  lng    Float?

  clientId String
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
}
```

## Migration Workflow

### Adding a new feature

1. **Edit `schema.prisma`** — add/modify models
2. **Generate migration:**
   ```bash
   npx prisma migrate dev --name add-scheduling-feature
   ```
3. **Review the generated SQL** in `prisma/migrations/[timestamp]_add_scheduling_feature/migration.sql`
4. **Update seed data** if needed
5. **Run `npx prisma generate`** to update the client

### Adding a field to an existing model

```prisma
// Adding a new optional field (safe — no data loss)
model Job {
  priority  JobPriority @default(NORMAL)  // new enum with default
  metadata  Json?                          // new nullable JSON field
}
```

```bash
npx prisma migrate dev --name add-job-priority-and-metadata
```

### Adding a required field to a table with existing data

```prisma
// Step 1: Add as optional first
model Job {
  dispatchZone String?  // nullable initially
}

// Step 2: Migrate, backfill data, then make required
// In the migration SQL, add: UPDATE "Job" SET "dispatchZone" = 'default' WHERE "dispatchZone" IS NULL;
// Step 3: Change to required
model Job {
  dispatchZone String
}
```

## Index Strategy

```prisma
// ALWAYS index organizationId first in composite indexes
// This ensures tenant-scoped queries are fast

model Job {
  // Primary tenant queries
  @@index([organizationId, status])
  @@index([organizationId, scheduledDate])
  @@index([organizationId, clientId])

  // Search / filtering
  @@index([organizationId, createdAt])

  // Unique constraints within tenant
  @@unique([organizationId, jobNumber])
}
```

**Index rules:**
- Every `organizationId` foreign key gets an index
- Composite indexes: `organizationId` always first
- Add indexes for any field used in `WHERE`, `ORDER BY`, or `JOIN`
- Unique constraints within tenant: `@@unique([organizationId, fieldName])`
- Don't over-index — each index slows down writes

## Seed Data Template

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean slate (development only)
  await prisma.job.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: "Bright Plumbing Co.",
      slug: "bright-plumbing",
      phone: "(555) 123-4567",
      email: "office@brightplumbing.com",
      timezone: "America/New_York",
    },
  });

  // Create demo user
  const owner = await prisma.user.create({
    data: {
      email: "owner@brightplumbing.com",
      name: "Sam Rivera",
      role: "OWNER",
      organizationId: org.id,
    },
  });

  // Create demo clients
  const clients = await Promise.all(
    [
      { firstName: "Maria", lastName: "Chen", phone: "(555) 234-5678", address: "123 Oak Street" },
      { firstName: "James", lastName: "Wilson", phone: "(555) 345-6789", address: "456 Maple Ave" },
      { firstName: "Aisha", lastName: "Patel", phone: "(555) 456-7890", address: "789 Pine Road" },
    ].map((c) =>
      prisma.client.create({
        data: { ...c, organizationId: org.id },
      })
    )
  );

  console.log(`Seeded: 1 org, 1 user, ${clients.length} clients`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

## Rules

- **Money is ALWAYS integers** (cents) — never Float or Decimal
- **organizationId on every business model** — no exceptions
- **Cascade deletes from Organization** — `onDelete: Cascade`
- **Timestamps on every model** — `createdAt` + `updatedAt`
- **Descriptive migration names** — `add-invoice-line-items` not `update-schema`
- **Review generated SQL** before applying — check for data loss
- **Soft delete** for jobs, invoices, clients — use `deletedAt` + `isActive`
- **Never store derived data** — calculate totals at query time or in application layer
- **String IDs** with `@default(cuid())` — never auto-increment integers

## Checklist Before Finishing

- [ ] Every business model has `organizationId` with relation and cascade delete
- [ ] `createdAt` and `updatedAt` on every model
- [ ] Money stored as Int (cents)
- [ ] Composite indexes with `organizationId` first
- [ ] Enum values are SCREAMING_SNAKE_CASE
- [ ] Migration name is descriptive kebab-case
- [ ] Seed data is updated for new models
- [ ] No breaking changes without a migration plan for existing data
