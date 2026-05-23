#!/bin/bash
# Clear build cache and rebuild

echo "🧹 Clearing build cache..."
rm -rf dist/
rm -rf node_modules/.vite/

echo "🔨 Building fresh..."
npm run build

echo "✅ Build complete! Hash: $(date +%s)"
echo ""
echo "📝 To see changes in browser:"
echo "   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "   - Or clear browser cache for this site"
