#!/bin/bash
set -e

echo "🚀 Starting Editly container initialization..."

# Clean any existing Xvfb lock files and processes
echo "🧹 Cleaning Xvfb locks and processes..."
rm -rf /tmp/.X*-lock /tmp/.X11-unix/X* 2>/dev/null || true
pkill -f Xvfb 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Create X11 directory if it doesn't exist
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# Test Xvfb startup
echo "🖥️  Testing Xvfb startup..."
if ! xvfb-run --server-args="-screen 0 1280x1024x24 -ac" --auto-servernum --server-num=1 echo "Xvfb test OK"; then
    echo "❌ Xvfb test failed, trying alternative approach..."
    # Kill any remaining X processes
    pkill -f "X" 2>/dev/null || true
    sleep 3
    # Try again with different display
    export DISPLAY=:99
    Xvfb :99 -screen 0 1280x1024x24 -ac &
    sleep 2
fi

echo "✅ Xvfb initialization complete"

# Start the main application
echo "🎬 Starting Editly API server..."
exec "$@"