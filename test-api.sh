#!/bin/bash

# Test script pentru Editly API
echo "🧪 Testing Editly API..."

API_URL="http://localhost:3001"

echo ""
echo "1. Testing health check..."
curl -s "$API_URL/health" | jq .

echo ""
echo "2. Testing API info..."
curl -s "$API_URL/info" | jq .

echo ""
echo "3. Testing simple video creation..."
curl -s -X POST "$API_URL/edit" \
  -H "Content-Type: application/json" \
  -d '{
    "editSpec": {
      "width": 640,
      "height": 480,
      "fps": 30,
      "fast": true,
      "clips": [
        {
          "duration": 3,
          "layers": [
            {
              "type": "title",
              "text": "Test Video API",
              "textColor": "#ffffff",
              "position": "center"
            },
            {
              "type": "fill-color",
              "color": "#ff6600"
            }
          ]
        }
      ]
    },
    "outputFilename": "test-api.mp4"
  }' | jq .

echo ""
echo "4. Listing output files..."
curl -s "$API_URL/files" | jq .

echo ""
echo "✅ Test completed!"
