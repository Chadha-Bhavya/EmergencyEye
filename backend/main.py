"""
WebRTC Signaling Server for EmergencyEye
Handles WebSocket connections for WebRTC peer connection signaling.
Also handles video recording storage and retrieval.
Includes Google OAuth authentication for police dashboard.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from jose import jwt, JWTError
import json
import asyncio
import os
import uuid
import httpx
from pathlib import Path

app = FastAPI(title="EmergencyEye Signaling Server")

# OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
JWT_SECRET = os.getenv("JWT_SECRET", "emergency-eye-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Security
security = HTTPBearer(auto_error=False)

# Create recordings directory
RECORDINGS_DIR = Path(__file__).parent / "recordings"
RECORDINGS_DIR.mkdir(exist_ok=True)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve recordings as static files
app.mount("/recordings", StaticFiles(directory=str(RECORDINGS_DIR)), name="recordings")


# ==================== OAuth Helper Functions ====================

def create_jwt_token(user_data: dict) -> str:
    """Create a JWT token for authenticated user."""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_data.get("email"),
        "name": user_data.get("name"),
        "picture": user_data.get("picture"),
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get current user from JWT token in Authorization header."""
    if not credentials:
        return None
    token = credentials.credentials
    return verify_jwt_token(token)


# ==================== OAuth Endpoints ====================

@app.get("/auth/google")
async def auth_google():
    """Redirect to Google OAuth consent page."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    redirect_uri = f"{FRONTEND_URL}/auth/callback"
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return {"auth_url": google_auth_url}


@app.post("/auth/google/callback")
async def auth_google_callback(code: str = Form(...)):
    """Exchange authorization code for tokens and user info."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    redirect_uri = f"{FRONTEND_URL}/auth/callback"
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
        
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        
        # Get user info
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        user_info = user_response.json()
    
    # Create our own JWT token
    jwt_token = create_jwt_token(user_info)
    
    return {
        "token": jwt_token,
        "user": {
            "email": user_info.get("email"),
            "name": user_info.get("name"),
            "picture": user_info.get("picture")
        }
    }


@app.get("/auth/verify")
async def verify_token(user: dict = Depends(get_current_user)):
    """Verify the current JWT token and return user info."""
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {
        "valid": True,
        "user": {
            "email": user.get("sub"),
            "name": user.get("name"),
            "picture": user.get("picture")
        }
    }


@app.post("/auth/logout")
async def logout():
    """Logout endpoint - client should discard token."""
    return {"success": True, "message": "Logged out successfully"}




@dataclass
class StreamInfo:
    id: str
    started_at: str
    latitude: float
    longitude: float
    notes: str
    is_active: bool = True

@dataclass 
class PastStreamInfo:
    id: str
    started_at: str
    ended_at: str
    latitude: float
    longitude: float
    notes: str
    duration_seconds: float
    video_filename: str
    video_url: str

# Store active streams and their broadcasters
active_streams: Dict[str, StreamInfo] = {}
# Store past streams metadata (in production, use a database)
past_streams: Dict[str, PastStreamInfo] = {}
# WebSocket connections: stream_id -> broadcaster WebSocket
broadcasters: Dict[str, WebSocket] = {}
# WebSocket connections: stream_id -> list of viewer WebSockets
viewers: Dict[str, List[WebSocket]] = {}
# Dashboard connections for stream list updates
dashboard_connections: List[WebSocket] = []


async def broadcast_stream_list():
    """Notify all dashboard connections of stream list changes."""
    stream_list = [asdict(s) for s in active_streams.values()]
    past_stream_list = [asdict(s) for s in past_streams.values()]
    message = json.dumps({
        "type": "stream_list", 
        "streams": stream_list,
        "past_streams": past_stream_list
    })
    
    disconnected = []
    for ws in dashboard_connections:
        try:
            await ws.send_text(message)
        except:
            disconnected.append(ws)
    
    for ws in disconnected:
        dashboard_connections.remove(ws)


@app.get("/")
async def root():
    return {"status": "ok", "service": "EmergencyEye Signaling Server"}


@app.get("/streams")
async def get_streams():
    """Get list of active streams."""
    return {"streams": [asdict(s) for s in active_streams.values()]}


@app.get("/past-streams")
async def get_past_streams():
    """Get list of past recorded streams."""
    return {"past_streams": [asdict(s) for s in past_streams.values()]}


@app.get("/past-streams/{stream_id}")
async def get_past_stream(stream_id: str):
    """Get a specific past stream."""
    if stream_id not in past_streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    return asdict(past_streams[stream_id])


@app.post("/upload-recording")
async def upload_recording(
    stream_id: str = Form(...),
    started_at: str = Form(...),
    ended_at: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    notes: str = Form(""),
    duration_seconds: float = Form(...),
    video: UploadFile = File(...)
):
    """Upload a recorded stream video."""
    # Generate unique filename
    video_filename = f"{stream_id}_{uuid.uuid4().hex[:8]}.webm"
    video_path = RECORDINGS_DIR / video_filename
    
    # Save the video file
    with open(video_path, "wb") as f:
        content = await video.read()
        f.write(content)
    
    # Store metadata
    past_stream = PastStreamInfo(
        id=stream_id,
        started_at=started_at,
        ended_at=ended_at,
        latitude=latitude,
        longitude=longitude,
        notes=notes,
        duration_seconds=duration_seconds,
        video_filename=video_filename,
        video_url=f"/recordings/{video_filename}"
    )
    past_streams[stream_id] = past_stream
    
    # Notify dashboards
    await broadcast_stream_list()
    
    return {"success": True, "stream": asdict(past_stream)}


@app.delete("/past-streams/{stream_id}")
async def delete_past_stream(stream_id: str):
    """Delete a past stream recording."""
    if stream_id not in past_streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Delete the video file
    video_path = RECORDINGS_DIR / past_streams[stream_id].video_filename
    if video_path.exists():
        video_path.unlink()
    
    # Remove from metadata
    del past_streams[stream_id]
    
    # Notify dashboards
    await broadcast_stream_list()
    
    return {"success": True}


@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """WebSocket for dashboard to receive stream list updates."""
    await websocket.accept()
    dashboard_connections.append(websocket)
    
    # Send current stream list including past streams
    stream_list = [asdict(s) for s in active_streams.values()]
    past_stream_list = [asdict(s) for s in past_streams.values()]
    await websocket.send_text(json.dumps({
        "type": "stream_list", 
        "streams": stream_list,
        "past_streams": past_stream_list
    }))
    
    try:
        while True:
            # Keep connection alive, handle any incoming messages
            data = await websocket.receive_text()
            # Dashboard might send heartbeat or other messages
    except WebSocketDisconnect:
        if websocket in dashboard_connections:
            dashboard_connections.remove(websocket)


@app.websocket("/ws/broadcast/{stream_id}")
async def broadcast_websocket(websocket: WebSocket, stream_id: str):
    """WebSocket for streamer to broadcast."""
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "start_stream":
                # Register the stream
                stream_info = StreamInfo(
                    id=stream_id,
                    started_at=datetime.now().isoformat(),
                    latitude=message.get("latitude", 0),
                    longitude=message.get("longitude", 0),
                    notes=message.get("notes", ""),
                )
                active_streams[stream_id] = stream_info
                broadcasters[stream_id] = websocket
                viewers[stream_id] = []
                
                await websocket.send_text(json.dumps({"type": "stream_started", "stream_id": stream_id}))
                await broadcast_stream_list()
                
            elif message["type"] == "update_location":
                if stream_id in active_streams:
                    active_streams[stream_id].latitude = message.get("latitude", 0)
                    active_streams[stream_id].longitude = message.get("longitude", 0)
                    await broadcast_stream_list()
                    
            elif message["type"] == "offer":
                # Forward offer to specific viewer
                viewer_id = message.get("viewer_id")
                if stream_id in viewers:
                    for viewer_ws in viewers[stream_id]:
                        try:
                            await viewer_ws.send_text(json.dumps({
                                "type": "offer",
                                "sdp": message["sdp"],
                                "stream_id": stream_id
                            }))
                        except:
                            pass
                            
            elif message["type"] == "ice_candidate":
                # Forward ICE candidate to viewers
                if stream_id in viewers:
                    for viewer_ws in viewers[stream_id]:
                        try:
                            await viewer_ws.send_text(json.dumps({
                                "type": "ice_candidate",
                                "candidate": message["candidate"],
                                "stream_id": stream_id
                            }))
                        except:
                            pass
                            
            elif message["type"] == "stop_stream":
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        # Clean up
        if stream_id in active_streams:
            del active_streams[stream_id]
        if stream_id in broadcasters:
            del broadcasters[stream_id]
        if stream_id in viewers:
            # Notify viewers stream ended
            for viewer_ws in viewers[stream_id]:
                try:
                    await viewer_ws.send_text(json.dumps({"type": "stream_ended", "stream_id": stream_id}))
                except:
                    pass
            del viewers[stream_id]
        await broadcast_stream_list()


@app.websocket("/ws/view/{stream_id}")
async def view_websocket(websocket: WebSocket, stream_id: str):
    """WebSocket for viewer to receive stream."""
    await websocket.accept()
    
    if stream_id not in active_streams:
        await websocket.send_text(json.dumps({"type": "error", "message": "Stream not found"}))
        await websocket.close()
        return
    
    if stream_id not in viewers:
        viewers[stream_id] = []
    viewers[stream_id].append(websocket)
    
    # Request offer from broadcaster
    if stream_id in broadcasters:
        try:
            await broadcasters[stream_id].send_text(json.dumps({
                "type": "viewer_joined",
                "viewer_id": id(websocket)
            }))
        except:
            pass
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "answer":
                # Forward answer to broadcaster
                if stream_id in broadcasters:
                    await broadcasters[stream_id].send_text(json.dumps({
                        "type": "answer",
                        "sdp": message["sdp"],
                        "viewer_id": id(websocket)
                    }))
                    
            elif message["type"] == "ice_candidate":
                # Forward ICE candidate to broadcaster
                if stream_id in broadcasters:
                    await broadcasters[stream_id].send_text(json.dumps({
                        "type": "ice_candidate",
                        "candidate": message["candidate"],
                        "viewer_id": id(websocket)
                    }))
                    
    except WebSocketDisconnect:
        pass
    finally:
        if stream_id in viewers and websocket in viewers[stream_id]:
            viewers[stream_id].remove(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
