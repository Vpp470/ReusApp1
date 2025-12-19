# Temporary download endpoint
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pathlib import Path

download_router = APIRouter()

@download_router.get("/download-server-py")
async def download_server():
    return FileResponse(
        Path(__file__).parent / "server.py",
        filename="server.py",
        media_type="text/plain"
    )
