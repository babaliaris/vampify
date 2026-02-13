# Vampify

An opinionated [Fastify](https://fastify.dev/) framework featuring [Drizzle-ORM](https://orm.drizzle.team/) and custom directory architecture.

---

## 🚀 Quick Start

The fastest way to **sink your teeth** into a new project is using the automated scaffolder.

### 1. Create a New Project
Run the creation script from your terminal:
```bash
./create-vampify.sh my-new-api
```

The script is located under `src/scripts/create-vampify.sh`

## 🚀 Install & Run
```bash
cd my-new-api
npm install
npm run dev
```

🔄 Updating the Framework
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
+ `external/vampify/`: The framework core (git submodule).

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

Pushes your Drizzle schema changes to the database.
```bash
npm run db:push
```

Runs database migrations.
```bash
npm run db:migrate:dev
```

Generate migrations under: `drizzle`.
```bash
npm run db:generate
```
