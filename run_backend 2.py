#!/usr/bin/env python
"""
Backend server startup script.
Run this to start the FastAPI backend server.
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Get project root directory
project_root = Path(__file__).parent

# Load environment variables from .env file in project root
env_file = project_root / ".env"
if env_file.exists():
    print(f"Loading environment variables from {env_file}")
    load_dotenv(env_file)
else:
    print(f"Warning: No .env file found at {env_file}")

# Add backend directory to Python path
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    import uvicorn
    
    print("\n🚀 Starting Notion Meeting Notes Backend...")
    print("📍 Backend will be available at: http://localhost:8000")
    print("📚 API docs available at: http://localhost:8000/docs")
    print("❤️  Health check: http://localhost:8000/health")
    print("\nPress CTRL+C to stop the server\n")
    
    # Change to backend directory for proper relative paths
    os.chdir(backend_dir)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disabled reload mode to fix startup issues
        log_level="info"
    )

