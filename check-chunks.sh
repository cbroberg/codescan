#!/bin/bash
echo "Searching for all content to count chunks..."
curl -s -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"function","maxResults":1000}' | jq '.data | length'

echo "Sample chunks (first 3):"
curl -s -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"function","maxResults":3}' | jq '.data[] | {name, type, repo: .repository}'
