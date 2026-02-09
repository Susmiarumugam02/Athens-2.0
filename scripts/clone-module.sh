#!/bin/bash
set -e
MODULE=$1
ATHENS_SRC="/var/www/athens/app"
ATHENS2_ROOT="/var/www/athens-2.0"

if [ -z "$MODULE" ]; then
    echo "Usage: $0 <module_name>"
    exit 1
fi

echo "Cloning module: $MODULE"

if [ -d "$ATHENS_SRC/backend/$MODULE" ]; then
    cp -r "$ATHENS_SRC/backend/$MODULE" "$ATHENS2_ROOT/backend/"
    echo "Backend copied"
fi

if [ -d "$ATHENS_SRC/frontend/src/features/$MODULE" ]; then
    mkdir -p "$ATHENS2_ROOT/frontend/src/features/athens"
    cp -r "$ATHENS_SRC/frontend/src/features/$MODULE" "$ATHENS2_ROOT/frontend/src/features/athens/"
    echo "Frontend copied"
fi

echo "Module $MODULE cloned"
