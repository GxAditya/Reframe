import os
import io
import numpy as np
from PIL import Image
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from opencv_fallback import create_artistic_effect, create_all_variants

# Load environment variables from .env file
load_dotenv()

# Initialize the Hugging Face Inference Client
def get_inference_client():
    """Initialize and return the Hugging Face Inference Client"""
    api_key = os.environ.get("HF_TOKEN")
    if not api_key:
        raise ValueError("HF_TOKEN environment variable is required for AI image processing")
    
    return InferenceClient(
        provider="fal-ai",
        api_key=api_key,
    )

def create_cartoon_effect_ai(pil_image, style="cartoon", intensity=1.0, blur=7, edge_threshold=100):
    """
    Create artistic transformation using AI-based image processing
    Styles: cartoon, sketch, watercolor, oilpaint
    Note: AI processing uses its own algorithms, so intensity/blur/edge_threshold are used for prompt modification
    """
    # Resize image if too large for API processing
    max_size = 1024
    original_image = pil_image.copy()
    if pil_image.width > max_size or pil_image.height > max_size:
        pil_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Convert PIL image to bytes for API call
    img_bytes = io.BytesIO()
    pil_image.save(img_bytes, format='PNG')
    input_image = img_bytes.getvalue()
    
    # Get the inference client
    client = get_inference_client()
    
    # Define style-specific prompts with intensity modifiers
    base_prompts = {
        "cartoon": "Transform this image into a classic cartoon style with bold colors, clean lines, and simplified features. Make it look like a traditional animated cartoon with vibrant colors and smooth shading.",
        "sketch": "Convert this image into a detailed pencil sketch style with fine line work, crosshatching, and realistic shading. Create a hand-drawn appearance with artistic pencil strokes and monochromatic tones.",
        "watercolor": "Transform this image into a watercolor painting style with soft, flowing colors, gentle brush strokes, and dreamy atmospheric effects. Create a delicate, artistic watercolor appearance with blended colors and organic textures.",
        "oilpaint": "Convert this image into an oil painting style with rich, textured brush strokes, vibrant colors, and classic painting techniques. Create a traditional oil painting appearance with visible brush work and artistic depth."
    }
    
    base_prompt = base_prompts.get(style, base_prompts["cartoon"])
    
    # Modify prompt based on intensity and parameters
    intensity_modifiers = {
        "low": "subtle and gentle",
        "medium": "balanced and artistic", 
        "high": "bold and dramatic"
    }
    
    if intensity < 0.7:
        modifier = intensity_modifiers["low"]
    elif intensity > 1.3:
        modifier = intensity_modifiers["high"]
    else:
        modifier = intensity_modifiers["medium"]
    
    prompt = f"{base_prompt} Apply a {modifier} transformation with enhanced artistic effects."
    
    # Call the AI model for image transformation
    result_image = client.image_to_image(
        input_image,
        prompt=prompt,
        model="Qwen/Qwen-Image-Edit",
    )
    
    print("AI transformation successful")
    return result_image

def create_cartoon_effect(pil_image, style="cartoon"):
    """
    Create artistic transformation using OpenCV (default) or AI processing
    Styles: cartoon, sketch, watercolor, oilpaint
    """
    # Default to OpenCV processing
    return create_artistic_effect(pil_image, style)

def test_ai_connection():
    """Test if AI service is available and properly configured"""
    try:
        client = get_inference_client()
        return True, "AI service is ready"
    except ValueError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Connection test failed: {str(e)}"

def process_uploaded_image(uploaded_file):
    """Convert uploaded file to PIL format"""
    if uploaded_file is not None:
        pil_image = Image.open(uploaded_file)
        
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        return pil_image
    return None

def create_variants_opencv(pil_image, style, intensity=1.0, blur=7, edge_threshold=100):
    """Create OpenCV variants for supported styles with custom parameters"""
    variants = {}
    variant_names = {
        "cartoon": ["light", "medium", "heavy", "anime"],
        "sketch": ["light", "medium", "dark", "detailed"],
        "watercolor": ["light", "medium", "heavy", "dreamy"],
        "oilpaint": ["subtle", "medium", "heavy", "impressionist"]
    }
    
    for variant in variant_names.get(style, ["medium"]):
        variants[variant] = create_artistic_effect(pil_image, style, intensity, blur, edge_threshold, variant)
    
    return variants

def has_variants(style):
    """Check if a style supports variants (OpenCV only)"""
    return style in ["sketch", "oilpaint", "cartoon", "watercolor"]

def create_download_link(pil_image, filename="transformed_image.png"):
    """Create download link for processed image"""
    buf = io.BytesIO()
    pil_image.save(buf, format='PNG')
    buf.seek(0)
    return buf.getvalue()