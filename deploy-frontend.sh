#!/bin/bash
# Deploy Athens 2.0 Frontend to Production

set -e

echo "🔨 Building frontend..."
cd /var/www/athens-2.0/frontend
npm run build

echo "📦 Copying to production..."
cp -r dist/* /var/www/athens/app/frontend/dist/

echo "🔄 Reloading nginx..."
nginx -s reload

echo "✅ Deployment complete!"
echo "🌐 Visit: https://ai-athens.cloud"
