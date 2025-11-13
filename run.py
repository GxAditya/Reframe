#!/usr/bin/env python3
"""
Reframe FastAPI Application Runner
"""
import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment or default to 8000
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print("🎨 Starting Reframe - AI Image Transformation Tool")
    print(f"🌐 Server will be available at: http://localhost:{port}")
    print("🚀 Press Ctrl+C to stop the server")
    
    uvicorn.run(
        "main:app",  # Use import string instead of app object
        host=host,
        port=port,
        reload=True,  # Enable auto-reload during development
        log_level="info"
    )