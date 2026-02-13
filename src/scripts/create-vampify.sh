#!/bin/bash

# Parameter Check: Ensure project name and framework path are provided
if [ -z "$1" ] ; then
    echo "Usage: create-vampify <project_name>"
    exit 1
fi

# Project name and vampify submodule directory name.
PROJECT_NAME=$1
VAMPIFY_DIR_NAME="external/vampify"

# Setup Project Directory
mkdir -p "$PROJECT_NAME"

# Change to the project directory and copy the path.
cd "$PROJECT_NAME" || exit
DEST_DIR=$(pwd)


# Git Initialization
git init

# Add vampify as a submodule
echo "📦 Adding Vampify as a submodule..."
git submodule add https://github.com/babaliaris/vampify.git $VAMPIFY_DIR_NAME
git submodule update --init --recursive

# Create a relative and an absolute path for the vampify submodule location.
VAMPIFY_RELATIVE="./$VAMPIFY_DIR_NAME"
VAMPIFY_ROOT_ABS="$DEST_DIR/$VAMPIFY_DIR_NAME"


echo "🧛 Cloning Vampify template to $DEST_DIR..."


# Create structure
mkdir -p src/db src/routes src/plugins drizzle

# Copy the "Golden Files" from the sandbox
cp "$VAMPIFY_ROOT_ABS/src/create-template/src/app.ts" "./src/app.ts"
cp "$VAMPIFY_ROOT_ABS/src/create-template/src/server.ts" "./src/server.ts"
cp "$VAMPIFY_ROOT_ABS/src/create-template/.env.development" .
cp "$VAMPIFY_ROOT_ABS/src/create-template/drizzle.config.ts" .
cp "$VAMPIFY_ROOT_ABS/src/create-template/.gitignore" .
cp "$VAMPIFY_ROOT_ABS/src/create-template/src/db/migrate.ts" "./src/db/migrate.ts"

# Add some important files as well.
touch src/routes/.gitkeep
touch src/plugins/.gitkeep
touch src/db/.gitkeep

# Use Node to sync the package.json versions
node -e "
const fs = require('fs');
const frameworkPkg = JSON.parse(fs.readFileSync('$VAMPIFY_ROOT_ABS/package.json', 'utf8'));
const newPkg = {
  name: '$PROJECT_NAME',
  version: '1.0.0',
  type: 'module',
  scripts: {
    'dev': 'cross-env NODE_ENV=development tsx watch src/server.ts',
    'build': 'rimraf dist && tsc && tsc-alias && mkdir -p dist/src/routes dist/src/plugins',
    'start': 'cross-env NODE_ENV=production node dist/src/server.js',
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

# Create the tsconfig.json
# This maps @/ to the local src, and @vampify/core to the submodule
cat <<EOF > tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ESNext"],
    "outDir": "dist",

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
      "@vampify/core": ["$VAMPIFY_RELATIVE/src/core/vampify.ts"]
    }
  },
  "include": ["src/**/*.ts", "$VAMPIFY_RELATIVE/src/core/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
EOF

echo "✅ Project $PROJECT_NAME created successfully!"
echo "👉 Next steps: cd $PROJECT_NAME && npm install"
