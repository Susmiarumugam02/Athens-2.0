#!/bin/bash
# Athens 2.0 - Health Check Script

HEALTH_URL="http://localhost:8003/api/system/health/"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Perform health check
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL 2>/dev/null || echo "FAILED")

if [ "$response" == "200" ]; then
    echo "[$TIMESTAMP] ✅ Backend is healthy (HTTP 200)"
    exit 0
else
    echo "[$TIMESTAMP] ❌ Backend health check failed (HTTP $response)"
    
    # Check service status
    echo "[$TIMESTAMP] Checking service status..."
    sudo systemctl is-active athens2-backend >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "[$TIMESTAMP] Service is running but not responding correctly"
    else
        echo "[$TIMESTAMP] Service is NOT running - attempting restart..."
        sudo systemctl restart athens2-backend
        sleep 5
        
        # Recheck
        response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL 2>/dev/null || echo "FAILED")
        if [ "$response" == "200" ]; then
            echo "[$TIMESTAMP] ✅ Service restarted successfully"
            exit 0
        else
            echo "[$TIMESTAMP] ❌ Service restart failed"
            exit 1
        fi
    fi
    
    exit 1
fi
