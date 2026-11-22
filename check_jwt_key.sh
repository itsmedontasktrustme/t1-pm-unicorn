#!/bin/bash
# Quick test script to verify JWT key configuration

echo "=== Checking Clerk JWT Key Configuration ==="
echo ""

# Check if running in Docker
if [ -f "/.dockerenv" ]; then
  echo "✅ Running in Docker"
  KEY="$CLERK_JWT_KEY"
else
  echo "⚠️  Not in Docker container. Set env vars before running this."
  exit 1
fi

if [ -z "$KEY" ]; then
  echo "❌ CLERK_JWT_KEY is not set!"
  exit 1
fi

echo "✅ CLERK_JWT_KEY is set"
echo ""

# Check length
LEN=${#KEY}
echo "Key length: $LEN characters"
if [ $LEN -lt 1000 ]; then
  echo "⚠️  Warning: Key seems too short (expected ~1500+ chars)"
else
  echo "✅ Key length looks good"
fi
echo ""

# Check format
if echo "$KEY" | head -1 | grep -q "BEGIN PUBLIC KEY"; then
  echo "✅ Key starts with 'BEGIN PUBLIC KEY'"
else
  echo "❌ Key does not start with 'BEGIN PUBLIC KEY'"
  echo "First line: $(echo "$KEY" | head -1)"
fi

if echo "$KEY" | tail -1 | grep -q "END PUBLIC KEY"; then
  echo "✅ Key ends with 'END PUBLIC KEY'"
else
  echo "❌ Key does not end with 'END PUBLIC KEY'"
  echo "Last line: $(echo "$KEY" | tail -1)"
fi

echo ""
echo "=== Key Format Check ==="
echo "First 50 chars:"
echo "$KEY" | head -c 50
echo "..."
echo ""
echo "Line count:"
echo "$KEY" | wc -l
