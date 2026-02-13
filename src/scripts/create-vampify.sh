#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: create-vampify <path_to_vampify_root>"
    exit 1
fi

VAMPIFY_ROOT=$(realpath "$1")
DEST_DIR=$(pwd)

echo "🧛 Cloning Vampify template to $DEST_DIR..."

# 1. Create structure
mkdir -p src/db src/routes src/plugins drizzle

# 2. Copy the "Golden Files" from the sandbox
cp "$VAMPIFY_ROOT/src/sandbox/app.ts" "./src/app.ts"
cp "$VAMPIFY_ROOT/src/sandbox/server.ts" "./src/server.ts"
cp "$VAMPIFY_ROOT/.env.development" .
cp "$VAMPIFY_ROOT/drizzle.config.ts" .
cp "$VAMPIFY_ROOT/src/sandbox/db/migrate.ts" "./src/db/migrate.ts"
echo "export const users = {};" > src/db/schema.ts

# 3. Use Node to sync the package.json versions
node -e "
const fs = require('fs');
const frameworkPkg = JSON.parse(fs.readFileSync('$VAMPIFY_ROOT/package.json', 'utf8'));
const newPkg = {
  name: 'vampify-app',
  version: '1.0.0',
  type: 'module',
  scripts: {
    'dev': 'cross-env NODE_ENV=development tsx watch src/server.ts',
    'build': 'rimraf dist && tsc && tsc-alias',
    'start': 'cross-env NODE_ENV=production node dist/server.js',
    'test': 'cross-env NODE_ENV=test node --test --import tsx \"src/**/*.{test,spec}.ts\"',
    'db:push': 'cross-env NODE_ENV=development drizzle-kit push',
    'db:generate': 'drizzle-kit generate',
    'db:migrate:dev': 'cross-env NODE_ENV=development tsx src/db/migrate.ts'
  },
  dependencies: frameworkPkg.dependencies,
  devDependencies: frameworkPkg.devDependencies
};
fs.writeFileSync('package.json', JSON.stringify(newPkg, null, 2));
"

# 4. Create the tsconfig.json
# This maps @/ to the local src, and @vampify/core to the submodule
cat <<EOF > tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ESNext"],
    "outDir": "dist",
    "rootDir": "src",

    /* Strictness */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "skipLibCheck": true,

    /* Module Interop */
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    /* Path Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@vampify/core": ["$VAMPIFY_ROOT/src/core/vampify.ts"]
    }
  },
  "include": ["src/**/*.ts", "$VAMPIFY_ROOT/src/core/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
EOF

echo "✅ Template copied! Run 'npm install' to start."