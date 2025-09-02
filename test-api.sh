#!/usr/bin/env bash

# DevMetrics Server Test Script
# This script demonstrates the API endpoints

echo "🚀 Testing DevMetrics Server..."
echo ""

# Test health endpoint
echo "1. Health Check:"
curl -s http://localhost:4000/health | jq .
echo ""

# Test user endpoint (will return 404 since no users are synced yet)
echo "2. User Lookup (example):"
curl -s http://localhost:4000/users/tanyamushonga | jq .
echo ""

# Test repos endpoint
echo "3. User Repos (example):"
curl -s http://localhost:4000/users/tanyamushonga/repos | jq .
echo ""

# Test stats endpoint
echo "4. User Stats (example):"
curl -s http://localhost:4000/users/tanyamushonga/stats | jq .
echo ""

echo "📝 Note: To see actual data, you need to:"
echo "   1. Add a user with githubAccessToken to the database"
echo "   2. Run the sync endpoint: curl -X POST http://localhost:4000/users/{username}/sync"
echo "   3. Or wait for the automatic 6-hour sync cron job"
