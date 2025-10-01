#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")"

# Activate virtual environment
source .venv/bin/activate

# Navigate to backend directory
cd backend

# Start the server
echo "Starting backend server on http://localhost:8000..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

