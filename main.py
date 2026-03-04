from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn
import io
import base64
from PIL import Image
from transform import create_artistic_effect, create_all_variants

app = FastAPI(title="Reframe API", description="Image Transformation Tool")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Routes
@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.post("/api/transform")
async def transform_image(
    file: UploadFile = File(...),
    style: str = Form(...),
    intensity: float = Form(1.0),
    blur: int = Form(7),
    edge_threshold: int = Form(100),
):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read and process image
        image_data = await file.read()
        pil_image = Image.open(io.BytesIO(image_data))
        
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Transform image using OpenCV
        result_image = create_artistic_effect(pil_image, style, intensity, blur, edge_threshold)
        
        # Convert result to base64
        buffer = io.BytesIO()
        result_image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        # Generate variants if supported
        variants = {}
        if style in ["sketch", "oilpaint", "cartoon", "watercolor"]:
            variant_images = create_all_variants(pil_image, style)
            for variant_name, variant_img in variant_images.items():
                variant_buffer = io.BytesIO()
                variant_img.save(variant_buffer, format='PNG')
                variants[variant_name] = base64.b64encode(variant_buffer.getvalue()).decode()
        
        # Return variants and main image
        response = {
            "success": True,
            "image": img_str,
            "style": style,
            "variants": variants
        }
        return JSONResponse(content=response)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
