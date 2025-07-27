#!/usr/bin/env bash

# Exit immediately on errors
set -e

echo "🔧 Installing system dependencies for node-gyp..."
apt-get update && apt-get install -y python3 make g++ gcc

echo "⚡ Installing Bun..."
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

echo "📦 Installing dependencies..."
bun install

echo "🧬 Generating Prisma client..."
bunx prisma generate

echo "🛠️ Building TypeScript code..."
bun run tsc

echo "✅ Build complete."
