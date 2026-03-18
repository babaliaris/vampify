# 🧛 Vampify

An opinionated [Fastify](https://fastify.dev/) framework featuring [Drizzle-ORM](https://orm.drizzle.team/), [mysql2/promise](https://www.npmjs.com/package/mysql2), [Typescript](https://www.typescriptlang.org/) a **custom directory architecture** and more!

Vampify is a strictly opinionated, high-performance wrapper for Fastify, engineered for developers who want a production-ready architecture without the "analysis paralysis" of choosing a stack.

Unlike frameworks that offer abstraction at the cost of complexity, Vampify provides a hard-coded, optimized ecosystem. You don't choose the pieces; you just build the features.

### 📍 Quick Navigation
* [🧱 The Locked Stack](#-the-locked-stack)
* [🚀 Quick Start](#-quick-start)
* [🚀 Install & Run](#-install-and-run)
* [🔄 Updating the Framework](#-updating-the-framework)
* [🛠️ Architecture](#%EF%B8%8F-architecture)
* [🗄️ Database Setup](#%EF%B8%8F-database-setup)
* [📜 Available Scripts](#-available-scripts)
* [🧪 Transaction Based Testing](#-transaction-based-testing)

## 🧱 The Locked Stack

*Vampify is built on a non-negotiable, deeply integrated foundation*:

+ **Core**: Fastify with native TypeBoxTypeProvider integration for end-to-end type safety.

+ **Database**: MySQL2 (Driver) + Drizzle-ORM.

+ **Instance**: Custom **VampifyInstance** (Extended FastifyInstance) with **db** decoration & **TypeBoxTypeProvider** pre-configured.

+ **Error Handling**: A unified, **hard-coded** handler for MySQL/MariaDB constraints and Typebox validations.

+ **Testing**: Built-in vampify-test suite featuring automatic transaction-based testing with hot-swappable DB instances to ensure data isolation.

> [!IMPORTANT]
> This is not a generic framework. Vampify is designed for teams who want to use this specific stack with *almost* zero configuration. **If you need PostgreSQL or a different validation library, this is not the tool for you**.


## 🚀 Quick Start

The fastest way to **sink your teeth** into a new project is using the automated scaffolder.

### 1. Create a New Project
Download [create-vampify.sh](src/scripts/create-vampify.sh) (*You don't have to clone this repo*) and run:
```bash
create-vampify.sh my-new-api
```

This will create a new project template called `my-new-api` that includes vampify as a git submodule, located at `external/vampify`.

## 🚀 Install And Run
```bash
cd my-new-api
npm install
npm run dev
```

## 🔄 Updating The Framework
> [!CAUTION]
> **Proceed with caution:** Updating to the latest version may introduce breaking changes. Ensure you have backed up your work or are working on a separate branch before merging.

Since Vampify is a submodule, updating to the latest version of the core is easy:
```bash
git submodule update --remote --merge
```


## 🛠️ Architecture
Vampify projects follow a strict, clean structure to ensure your codebase stays maintainable:
+ `src/app.ts`: The core plugin that handles registrations.
+ `src/server.ts`: The entry point that starts the HTTP server.
+ `src/routes/`: Auto-loaded routes.
+ `src/plugins/`: Custom Fastify plugins (Auto-loaded).
+ `src/db/`: Drizzle schema and migration logic.
+ `src/tests/e2e/`: End-to-end tests.
+ `src/tests/unit/`: Unit tests.
+ `drizzle/`: Drizzle migrations container.
+ `dist/`: Production files (after building the project `npm run build`).

## 🗄️ Database Setup
Vampify requires two separate databases to keep your development data isolated from your automated tests.

### 1. Create the Databases

Run the following commands in your MySQL terminal (or use a GUI tool like TablePlus or DBeaver) to initialize your local environment:
```bash
CREATE DATABASE <database_name>_dev;
CREATE DATABASE <database_name>_test;
```

### 2. Configure Environment Variables

You will find **.env.development** and **.env.test** files in the root directory. Update both files with your local credentials.

> [!IMPORTANT]
> Ensure the DB_NAME and DB_URL in .env.test point to your test database, while .env.development points to your dev database.

Example Configuration (.env.development):
```bash
SERVER_PORT=3000

# Database Configuration
DB_URL=mysql://root:0401@localhost:3306/<database_name>_dev
DB_HOST=localhost
DB_USER=root
DB_PASS=0401
DB_NAME=<database_name>_dev
DB_LIMIT=10
DB_DEBUG=false

# Authentication & Logging
JWT_SECRET=just_a_secret_key
JWT_EXPIRES=60

#Can be: development OR production OR test
RUN_MODE=development

#Can be: roll OR pretty OR stdout
LOG_METHOD=pretty
LOGGING=true
```

### 3. Production Environment

The template does not include a .env.production file by default. To deploy to production:

+ Copy the .env.development file.
+ Rename it to .env.production.
+ Update the values (especially JWT_SECRET and DB_PASS) to secure, production-grade credentials.

## 📜 Available Scripts
Starts the server in development mode with hot-reload (tsx).
```bash
npm run dev
```

Compiles TypeScript to the dist folder.
```bash
npm run build
```

Runs the compiled production build.
```bash
npm run start
```

Generate migrations under: `drizzle/`.
```bash
npm run db:generate
```

Migrate the new schema changes to both the development and testing databases.
```bash
npm run db:migrate
```

Runs end-to-end tests.
```bash
npm run test:e2e
```

Runs unit tests.
```bash
npm run test:unit
```

## 🧪 Transaction Based Testing

Vampify includes a custom testing utility, **@vampify/test**, specifically designed to handle database state. Vampify runs each test inside a database transaction that automatically rolls back.

When you use `runInTransaction(async (fastify)=>...)`, Vampify provides a fastify instance where **fastify.db** is redirected to the active transaction. Any code (including your actual API logic) using fastify.db will participate in that transaction.

```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { vampifySetupE2E } from "@vampify/test";
import { vampifyApp } from "@/sandbox/app.js";
import { usersTable } from "../../db/schema.js";
import { eq } from 'drizzle-orm';

describe('Database Isolation Tests', () =>
{
  const e2e_suite = vampifySetupE2E(vampifyApp);

  test('Should insert a user safely', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify) =>
    {
      // Insert data using the transaction-wrapped fastify.db
      const res = await fastify.db.insert(usersTable).values({ 
        name: "Nick", 
        age: 30, 
        email: "nick@vampify.io" 
      });
      
      assert(res[0].insertId > 0);

      // Data exists within this transaction
      const select = await fastify.db.select().from(usersTable).where(eq(usersTable.name, "Nick"));
      assert.strictEqual(select.length, 1);
    });
    // After the block above, the transaction ROLLS BACK automatically.
  });

  test('Database should be clean for the next test', async () =>
  {
    await e2e_suite.runInTransaction(async (fastify) =>
    {
      const select = await fastify.db.select().from(usersTable).where(eq(usersTable.name, "Nick"));
      // Assert that "Nick" does not exist in the DB
      assert.strictEqual(select.length, 0);
    });
  });
});
```

### End-to-End API Testing

Vampify leverages Fastify's **.inject()** to test your endpoints without needing to bind to a network port, ensuring your tests run at maximum speed.

```typescript
test('Should fail if the Digital Footprint is compromised', async () =>
{
  // Login with a specific User-Agent
  const loginRes = await e2e_suite.fastify.inject({
    method: 'GET',
    url: '/credentials-login',
    headers: { 'user-agent': 'VampireBrowser/1.0' }
  });

  const cookie = loginRes.headers['set-cookie'];

  // Attempt to use that cookie from a DIFFERENT User-Agent
  const maliciousRes = await e2e_suite.fastify.inject({
    method: 'GET',
    url: '/credentials-check-payload',
    headers: {
      cookie: Array.isArray(cookie) ? cookie[0] : cookie,
      'user-agent': 'HackerBrowser/2.0' // Unauthorized!
    }
  });

  assert.strictEqual(maliciousRes.statusCode, 401);
});
```
