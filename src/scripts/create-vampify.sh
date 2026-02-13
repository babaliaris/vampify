#!/bin/bash

# --- Color Definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color (Reset)

# --- ASCII Banner ---
clear
echo -e "${MAGENTA}${BOLD}"
echo " ██╗   ██╗ █████╗ ███╗   ███╗██████╗ ██╗███████╗██╗   ██╗"
echo " ██║   ██║██╔══██╗████╗ ████║██╔══██╗██║██╔════╝╚██╗ ██╔╝"
echo " ██║   ██║███████║██╔████╔██║██████╔╝██║█████╗   ╚████╔╝ "
echo " ╚██╗ ██╔╝██╔══██║██║╚██╔╝██║██╔═══╝ ██║██╔══╝    ╚██╔╝  "
echo "  ╚████╔╝ ██║  ██║██║ ╚═╝ ██║██║     ██║██║        ██║   "
echo "   ╚═══╝  ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝╚═╝        ╚═╝   "
echo -e "${NC}"
echo -e "${CYAN}             Vampify Framework Scaffolder${NC}\n"

# Parameter Check: Ensure project name and framework path are provided
if [ -z "$1" ] ; then
    echo "${RED}${BOLD}Usage${NC}: create-vampify <project_name>"
    exit 1
fi

# Project name and vampify submodule directory name.
PROJECT_NAME=$1
VAMPIFY_DIR_NAME="external/vampify"

# Setup Project Directory
echo -e "${CYAN}🚀 Initializing project: ${BOLD}$PROJECT_NAME${NC}"
mkdir -p "$PROJECT_NAME"

# Change to the project directory and copy the path.
cd "$PROJECT_NAME" || exit
DEST_DIR=$(pwd)


# Git Initialization
git init

# Add vampify as a submodule
echo -e "${YELLOW}📦 Adding Vampify as a submodule...${NC}"
git submodule add https://github.com/babaliaris/vampify.git $VAMPIFY_DIR_NAME
git submodule update --init --recursive

# Create a relative and an absolute path for the vampify submodule location.
VAMPIFY_RELATIVE="./$VAMPIFY_DIR_NAME"
VAMPIFY_ROOT_ABS="$DEST_DIR/$VAMPIFY_DIR_NAME"


# Create drizzle folder.
echo -e "${MAGENTA}📂 Preparing database directories...${NC}"
mkdir -p drizzle
touch drizzle/.gitkeep

# Copy the project structure and files.
echo -e "${MAGENTA}🧛 Applying Vampify template...${NC}"
cp -rv "$VAMPIFY_ROOT_ABS/src/create-template/." "."| sed "s/^/  /"


# Use Node to sync the package.json versions
echo -e "${BLUE}⚙️  Generating package.json...${NC}"
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
echo -e "${BLUE}⚙️  Configuring TypeScript aliases...${NC}"
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

echo -e "\n${GREEN}${BOLD}✅ Project $PROJECT_NAME created successfully!${NC}"
echo -e "${YELLOW}👉 Next steps:${NC}"
echo -e "   1. ${CYAN}cd $PROJECT_NAME${NC}"
echo -e "   2. ${CYAN}npm install${NC}"
echo -e "   3. ${CYAN}npm run dev${NC}\n"
