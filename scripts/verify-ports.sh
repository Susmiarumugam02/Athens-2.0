#!/bin/bash
# Athens 2.0 - Port Configuration Verification Script

echo "=== Athens 2.0 Port Configuration Check ==="
echo ""

# Check backend service port
echo "1. Checking backend service configuration..."
SERVICE_PORT=$(sudo systemctl cat athens2-backend 2>/dev/null | grep "bind" | grep -oP ':\K[0-9]+' || echo "NOT_FOUND")

if [ "$SERVICE_PORT" == "NOT_FOUND" ]; then
    echo "   ❌ Backend service not found or not configured"
    echo "   Trying to detect from running process..."
    SERVICE_PORT=$(ps aux | grep gunicorn | grep athens-2.0 | grep -oP 'bind 127.0.0.1:\K[0-9]+' | head -1 || echo "NOT_FOUND")
    if [ "$SERVICE_PORT" == "NOT_FOUND" ]; then
        echo "   ❌ Could not detect backend port"
        exit 1
    fi
fi
echo "   ✅ Backend service port: $SERVICE_PORT"

# Check nginx configuration
echo ""
echo "2. Checking nginx configuration..."
NGINX_PORT=$(sudo grep -r "proxy_pass.*127.0.0.1" /etc/nginx/sites-enabled/athens2* 2>/dev/null | grep -oP ':\K[0-9]+' | head -1 || echo "NOT_FOUND")

if [ "$NGINX_PORT" == "NOT_FOUND" ]; then
    echo "   ❌ Nginx configuration not found"
    exit 1
fi
echo "   ✅ Nginx proxy port: $NGINX_PORT"

# Verify they match
echo ""
echo "3. Verifying port consistency..."
if [ "$SERVICE_PORT" == "$NGINX_PORT" ]; then
    echo "   ✅ Port configuration is CORRECT"
else
    echo "   ❌ PORT MISMATCH DETECTED!"
    echo "      Backend service: $SERVICE_PORT"
    echo "      Nginx proxy: $NGINX_PORT"
    echo ""
    echo "   Fix with:"
    echo "   sudo sed -i 's/127.0.0.1:$NGINX_PORT/127.0.0.1:$SERVICE_PORT/g' /etc/nginx/sites-available/athens2-ssl"
    echo "   sudo nginx -t && sudo systemctl reload nginx"
    exit 1
fi

# Check if port is listening
echo ""
echo "4. Checking if backend is listening..."
if sudo ss -tlnp 2>/dev/null | grep -q ":$SERVICE_PORT"; then
    echo "   ✅ Backend is listening on port $SERVICE_PORT"
else
    echo "   ❌ Backend is NOT listening on port $SERVICE_PORT"
    echo "   Service may be down. Check with: sudo systemctl status athens2-backend"
    exit 1
fi

# Test health endpoint
echo ""
echo "5. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$SERVICE_PORT/api/system/health/ 2>/dev/null || echo "FAILED")

if [ "$HEALTH_RESPONSE" == "200" ]; then
    echo "   ✅ Health check passed (HTTP 200)"
else
    echo "   ⚠️  Health check returned: $HEALTH_RESPONSE"
fi

echo ""
echo "=== All Checks Complete ==="
