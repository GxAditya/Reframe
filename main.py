from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import io
import base64
from PIL import Image
import sqlite3
from passlib.hash import pbkdf2_sha256
import jwt
from datetime import datetime, timedelta
import os
from toonify import create_cartoon_effect_ai, test_ai_connection, create_variants_opencv, has_variants
from opencv_fallback import create_artistic_effect

app = FastAPI(title="Toonify API", description="AI-Powered Image Transformation Tool")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Simple in-memory rate limiting (per-user)
RATE_LIMIT_MAX = int(os.environ.get("TOONIFY_RATE_LIMIT_MAX", "10"))  # requests per window
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("TOONIFY_RATE_LIMIT_WINDOW", "86400"))  # default 24h
_rate_limit_store = {}

def _get_rate_bucket(username: str):
    now = datetime.utcnow()
    bucket = _rate_limit_store.get(username)
    if not bucket or now >= bucket["reset_at"]:
        bucket = {"count": 0, "reset_at": now + timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)}
        _rate_limit_store[username] = bucket
    return bucket

def check_and_increment_rate(username: str):
    bucket = _get_rate_bucket(username)
    if bucket["count"] >= RATE_LIMIT_MAX:
        reset_in = int((bucket["reset_at"] - datetime.utcnow()).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Please upgrade to continue. Window resets in {reset_in} seconds.",
            headers={
                "X-RateLimit-Limit": str(RATE_LIMIT_MAX),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(bucket["reset_at"].timestamp()))
            }
        )
    bucket["count"] += 1
    remaining = max(RATE_LIMIT_MAX - bucket["count"], 0)
    return bucket["reset_at"], remaining

# JWT Configuration
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

# Database initialization
def init_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users
        (username TEXT PRIMARY KEY, password TEXT)
    ''')
    conn.commit()
    conn.close()

init_db()

# Authentication functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_user(username: str, password: str):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('SELECT password FROM users WHERE username = ?', (username,))
    result = c.fetchone()
    conn.close()
    
    if result and pbkdf2_sha256.verify(password, result[0]):
        return True
    return False

def create_user(username: str, password: str):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    try:
        hashed = pbkdf2_sha256.hash(password)
        c.execute('INSERT INTO users (username, password) VALUES (?, ?)', 
                 (username, hashed))
        conn.commit()
        return True, "Registration successful!"
    except sqlite3.IntegrityError:
        return False, "Username already exists"
    except Exception as e:
        return False, f"An error occurred: {str(e)}"
    finally:
        conn.close()

# Routes
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.get("/editor", response_class=HTMLResponse)
async def editor_view():
    """Serve the main app but auto-open the editor section for better UX."""
    with open("static/index.html", "r", encoding="utf-8") as f:
        html = f.read()
    # Inject a tiny script after the existing script include to switch to the editor on load
    injection = (
        "\n    <script>\n"
        "    window.addEventListener('DOMContentLoaded', function(){\n"
        "        if (typeof showMainApp === 'function') {\n"
        "            try { showMainApp(); } catch (e) { console.error(e); }\n"
        "        }\n"
        "    });\n"
        "    </script>\n"
    )
    # Place injection before closing body tag
    if "</body>" in html:
        html = html.replace("</body>", f"{injection}</body>")
    return HTMLResponse(content=html, status_code=200)

@app.get("/payment", response_class=HTMLResponse)
async def payment_page():
    with open("static/payment.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.get("/payment-gateways", response_class=HTMLResponse)
async def payment_gateways_page():
    with open("static/payment-gateways.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.post("/api/register")
async def register(username: str = Form(...), password: str = Form(...)):
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    success, message = create_user(username, password)
    if success:
        return {"message": message}
    else:
        raise HTTPException(status_code=400, detail=message)

@app.post("/api/login")
async def login(username: str = Form(...), password: str = Form(...)):
    if verify_user(username, password):
        access_token = create_access_token(data={"sub": username})
        return {"access_token": access_token, "token_type": "bearer", "username": username}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/test-ai")
async def test_ai(username: str = Depends(verify_token)):
    is_ready, message = test_ai_connection()
    return {"ready": is_ready, "message": message}

@app.post("/api/transform")
async def transform_image(
    file: UploadFile = File(...),
    style: str = Form(...),
    use_ai: bool = Form(False),
    intensity: float = Form(1.0),
    blur: int = Form(7),
    edge_threshold: int = Form(100),
    username: str = Depends(verify_token)
):
    # Enforce per-user rate limit before heavy work
    reset_at, remaining = check_and_increment_rate(username)
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read and process image
        image_data = await file.read()
        pil_image = Image.open(io.BytesIO(image_data))
        
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Transform image
        if use_ai:
            try:
                result_image = create_cartoon_effect_ai(pil_image, style, intensity, blur, edge_threshold)
                ai_used = True
            except Exception as e:
                # Fallback to OpenCV
                result_image = create_artistic_effect(pil_image, style, intensity, blur, edge_threshold)
                ai_used = False
        else:
            result_image = create_artistic_effect(pil_image, style, intensity, blur, edge_threshold)
            ai_used = False
        
        # Convert result to base64
        buffer = io.BytesIO()
        result_image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        # Generate variants if using OpenCV
        variants = {}
        if not ai_used and has_variants(style):
            variant_images = create_variants_opencv(pil_image, style, intensity, blur, edge_threshold)
            for variant_name, variant_img in variant_images.items():
                variant_buffer = io.BytesIO()
                variant_img.save(variant_buffer, format='PNG')
                variants[variant_name] = base64.b64encode(variant_buffer.getvalue()).decode()
        
        response = {
            "success": True,
            "image": img_str,
            "ai_used": ai_used,
            "style": style,
            "variants": variants
        }
        return JSONResponse(
            content=response,
            headers={
                "X-RateLimit-Limit": str(RATE_LIMIT_MAX),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(int(reset_at.timestamp()))
            }
        )

    except HTTPException:
        # Bubble up rate limit errors etc.
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/change-username")
async def change_username(
    new_username: str = Form(...),
    security_answer: str = Form(...),
    username: str = Depends(verify_token)
):
    if len(new_username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    
    # Check if new username already exists
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('SELECT username FROM users WHERE username = ?', (new_username,))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")
    
    try:
        # Update username in database
        c.execute('UPDATE users SET username = ? WHERE username = ?', (new_username, username))
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Username changed successfully", "new_username": new_username}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to change username: {str(e)}")

@app.post("/api/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    security_answer: str = Form(...),
    username: str = Depends(verify_token)
):
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    
    # Verify current password
    if not verify_user(username, current_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    
    try:
        # Update password in database
        hashed_new_password = pbkdf2_sha256.hash(new_password)
        c.execute('UPDATE users SET password = ? WHERE username = ?', (hashed_new_password, username))
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Password changed successfully"}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)