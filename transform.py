import cv2
import numpy as np
from PIL import Image
import time

def pil_to_opencv(pil_image):
    return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

def opencv_to_pil(opencv_image):
    rgb_image = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb_image)

# ---------------------- Performance Optimization Helper ----------------------
def resize_for_processing(img, max_size=1024):
    """Resize image for faster processing if too large"""
    h, w = img.shape[:2]
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA), (w, h)
    return img, None

def restore_size(img, original_size):
    """Restore image to original size if it was resized"""
    if original_size:
        return cv2.resize(img, original_size, interpolation=cv2.INTER_CUBIC)
    return img

# ---------------------- Optimized Cartoon Effect ----------------------
def create_cartoon_opencv(img, variant="medium", intensity=1.0, blur=7, edge_threshold=100):
    """Optimized cartoon effect with better quality and dynamic parameters"""
    # Resize for faster processing
    img_small, orig_size = resize_for_processing(img, 600)  # Reduced size for faster processing
    
    # Base parameters that can be modified by user input
    base_params = {
        "light": {"blur": 3, "thresh": 9, "bilateral": 5, "k": 16},
        "medium": {"blur": 5, "thresh": 7, "bilateral": 7, "k": 12},
        "heavy": {"blur": 7, "thresh": 5, "bilateral": 9, "k": 8},
        "anime": {"blur": 9, "thresh": 3, "bilateral": 11, "k": 6}
    }
    
    p = base_params.get(variant, base_params["medium"])
    
    # Apply user parameters
    p["blur"] = max(1, min(15, blur))  # Clamp blur between 1-15
    p["thresh"] = max(3, min(15, int(edge_threshold / 10)))  # Convert edge_threshold to thresh range
    p["bilateral"] = max(3, min(15, int(p["bilateral"] * intensity)))  # Scale bilateral with intensity
    
    # Optimized bilateral filter for better performance
    smooth = cv2.bilateralFilter(img_small, p["bilateral"], 50, 50)
    
    # Faster edge detection
    gray = cv2.cvtColor(smooth, cv2.COLOR_BGR2GRAY)
    gray_blur = cv2.medianBlur(gray, p["blur"])
    edges = cv2.adaptiveThreshold(
        gray_blur, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,  # Switched back to MEAN for faster processing
        cv2.THRESH_BINARY,
        p["thresh"] * 2 + 1, p["thresh"]
    )
    
    # Convert edges to 3-channel
    edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    
    # Faster color quantization
    data = smooth.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)  # Reduced iterations for speed
    _, labels, centers = cv2.kmeans(data, p["k"], None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    centers = np.uint8(centers)
    quantized = centers[labels.flatten()].reshape(smooth.shape)
    
    # Combine edges and colors
    cartoon = cv2.bitwise_and(quantized, edges)
    
    # Color enhancement
    cartoon = cv2.addWeighted(quantized, 0.8, cartoon, 0.2, 0)
    
    # Saturation boost based on intensity
    cartoon_hsv = cv2.cvtColor(cartoon, cv2.COLOR_BGR2HSV).astype(np.float32)
    saturation_boost = 1.0 + (0.3 * intensity)  # Scale saturation with intensity
    cartoon_hsv[:, :, 1] *= saturation_boost
    cartoon_hsv[:, :, 1][cartoon_hsv[:, :, 1] > 255] = 255
    cartoon = cv2.cvtColor(cartoon_hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    
    # Restore original size
    cartoon = restore_size(cartoon, orig_size)
    
    return cartoon

# ---------------------- Optimized Pencil Sketch ----------------------
def create_pencil_sketch_opencv(img, variant="medium", intensity=1.0, blur=7, edge_threshold=100):
    """Optimized pencil sketch with variants and dynamic parameters"""
    # Work with smaller image for speed
    img_small, orig_size = resize_for_processing(img, 800)
    
    gray = cv2.cvtColor(img_small, cv2.COLOR_BGR2GRAY)
    
    # Base variant parameters
    base_params = {
        "light": {"blur_size": 15, "thresh": 9, "canny_low": 40, "canny_high": 120},
        "medium": {"blur_size": 21, "thresh": 7, "canny_low": 60, "canny_high": 180},
        "dark": {"blur_size": 25, "thresh": 5, "canny_low": 80, "canny_high": 220},
        "detailed": {"blur_size": 19, "thresh": 5, "canny_low": 50, "canny_high": 150}
    }
    
    p = base_params.get(variant, base_params["medium"])
    
    # Apply user parameters
    p["blur_size"] = max(5, min(31, blur * 3))  # Scale blur for Gaussian blur (must be odd)
    if p["blur_size"] % 2 == 0:
        p["blur_size"] += 1
    p["canny_low"] = max(20, min(150, edge_threshold - 40))
    p["canny_high"] = max(60, min(250, edge_threshold + 80))
    
    # Enhanced inverted blur technique
    inv = 255 - gray
    blur = cv2.GaussianBlur(inv, (p["blur_size"], p["blur_size"]), 0)
    inv_blur = 255 - blur
    sketch = cv2.divide(gray, inv_blur, scale=250.0)  # Reduced scale for better contrast
    
    # Improved edge detection with better parameters
    edges = cv2.Canny(gray, p["canny_low"], p["canny_high"], apertureSize=3, L2gradient=True)
    
    # Enhanced combination of sketch and edges with intensity control
    sketch_intensity = 0.7 + (0.3 * intensity)  # Scale sketch intensity
    sketch = cv2.multiply(sketch, sketch_intensity)
    edge_intensity = 0.5 + (0.3 * intensity)  # Scale edge enhancement
    sketch[edges > 0] = sketch[edges > 0] * edge_intensity
    
    # Convert to 3-channel with better quality
    sketch = cv2.cvtColor(sketch.astype(np.uint8), cv2.COLOR_GRAY2BGR)
    
    # Add slight contrast enhancement
    sketch = cv2.convertScaleAbs(sketch, alpha=1.1, beta=5)
    
    # Restore size
    sketch = restore_size(sketch, orig_size)
    
    return sketch

# ---------------------- Improved Watercolor ----------------------
def create_watercolor_opencv(img, variant="medium", intensity=1.0, blur=7, edge_threshold=100):
    """Simplified and faster watercolor effect with dynamic parameters"""
    # Resize for speed
    img_small, orig_size = resize_for_processing(img, 800)
    
    # Base variant parameters
    base_params = {
        "light": {"blur": 3, "bilateral_d": 9, "bilateral_sigma": 50, "edge_sigma_s": 30, "edge_sigma_r": 0.3, "sat_boost": 1.05, "bright_boost": 1.02},
        "medium": {"blur": 5, "bilateral_d": 15, "bilateral_sigma": 80, "edge_sigma_s": 50, "edge_sigma_r": 0.4, "sat_boost": 1.1, "bright_boost": 1.05},
        "heavy": {"blur": 7, "bilateral_d": 21, "bilateral_sigma": 110, "edge_sigma_s": 70, "edge_sigma_r": 0.5, "sat_boost": 1.15, "bright_boost": 1.08},
        "dreamy": {"blur": 9, "bilateral_d": 27, "bilateral_sigma": 140, "edge_sigma_s": 90, "edge_sigma_r": 0.6, "sat_boost": 1.2, "bright_boost": 1.1}
    }
    
    p = base_params.get(variant, base_params["medium"])
    
    # Apply user parameters
    p["blur"] = max(1, min(15, blur))
    p["bilateral_sigma"] = max(30, min(150, int(p["bilateral_sigma"] * intensity)))
    p["edge_sigma_r"] = max(0.1, min(0.8, p["edge_sigma_r"] * intensity))
    p["sat_boost"] = 1.0 + ((p["sat_boost"] - 1.0) * intensity)
    
    # New approach to eliminate dark outlines completely
    # Start with bilateral filtering for smoothness
    smooth = cv2.bilateralFilter(img_small, p["bilateral_d"], p["bilateral_sigma"], p["bilateral_sigma"])
    
    # Apply edge-preserving filter instead of stylization
    watercolor = cv2.edgePreservingFilter(smooth, flags=1, sigma_s=p["edge_sigma_s"], sigma_r=p["edge_sigma_r"])
    
    # Apply soft blur for watercolor feel
    if p["blur"] > 1:
        watercolor = cv2.GaussianBlur(watercolor, (p["blur"], p["blur"]), 1.5)
    
    # Color enhancement for watercolor effect
    # Convert to HSV for better color control
    watercolor_hsv = cv2.cvtColor(watercolor, cv2.COLOR_BGR2HSV).astype(np.float32)
    
    # Boost saturation for artistic effect
    watercolor_hsv[:, :, 1] *= p["sat_boost"]
    watercolor_hsv[:, :, 1] = np.clip(watercolor_hsv[:, :, 1], 0, 255)
    
    # Adjust brightness
    watercolor_hsv[:, :, 2] *= p["bright_boost"]
    watercolor_hsv[:, :, 2] = np.clip(watercolor_hsv[:, :, 2], 0, 255)
    
    # Convert back to BGR
    watercolor = cv2.cvtColor(watercolor_hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    
    # Blend with original for color fidelity
    alpha = 0.85  # How much of the watercolor effect to keep
    beta = 0.15   # How much of the original to preserve
    watercolor = cv2.addWeighted(watercolor, alpha, img_small, beta, 0)
    
    # Restore size
    watercolor = restore_size(watercolor, orig_size)
    
    return watercolor

# ---------------------- Improved Oil Painting ----------------------
def create_oilpaint_opencv(img, variant="medium", intensity=1.0, blur=7, edge_threshold=100):
    """Improved oil painting effect with dynamic parameters"""
    # Resize for speed
    img_small, orig_size = resize_for_processing(img, 800)
    
    base_params = {
        "subtle": {"size": 2, "levels": 10, "bilateral": 3},
        "medium": {"size": 3, "levels": 12, "bilateral": 5},
        "heavy": {"size": 4, "levels": 14, "bilateral": 7},
        "impressionist": {"size": 5, "levels": 16, "bilateral": 9}
    }
    
    p = base_params.get(variant, base_params["medium"])
    
    # Apply user parameters
    p["size"] = max(1, min(7, int(p["size"] * intensity)))
    p["levels"] = max(6, min(20, int(p["levels"] * intensity)))
    p["bilateral"] = max(3, min(15, blur))
    
    # Check if image is too dark and adjust
    gray = cv2.cvtColor(img_small, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)
    
    # Enhanced brightness adjustment for dark images
    working_img = img_small.copy()
    if mean_brightness < 70:
        # Improved adaptive brightness adjustment
        gamma = 1.1
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")
        working_img = cv2.LUT(working_img, table)
    
    try:
        # Try OpenCV's oil painting if available
        if hasattr(cv2, 'xphoto') and hasattr(cv2.xphoto, 'oilPainting'):
            oil = cv2.xphoto.oilPainting(working_img, p["size"], p["levels"])
        else:
            raise AttributeError("xphoto not available")
    except:
        # Enhanced fallback: Custom oil painting using bilateral filter and quantization
        # Single bilateral filter to preserve details
        oil = cv2.bilateralFilter(working_img, p["bilateral"], 50, 50)
        
        # Create edge mask to preserve important details
        gray = cv2.cvtColor(working_img, cv2.COLOR_BGR2GRAY)
        edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 2)
        edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR) / 255.0
        
        # Apply color quantization with more colors to preserve details
        data = oil.reshape((-1, 3)).astype(np.float32)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 15, 1.0)
        k = max(8, p["levels"])  # More colors to preserve details
        _, labels, centers = cv2.kmeans(data, k, None, criteria, 5, cv2.KMEANS_PP_CENTERS)
        centers = np.uint8(centers)
        quantized = centers[labels.flatten()].reshape(oil.shape)
        
        # Blend quantized image with edges preserved
        oil = (quantized * (1 - edges * 0.7) + oil * edges * 0.7).astype(np.uint8)
    
    # Gentle blending for brightened images
    if mean_brightness < 70:
        oil = cv2.addWeighted(oil, 0.9, img_small, 0.1, 0)
    
    # Subtle saturation and vibrance enhancement
    oil_hsv = cv2.cvtColor(oil, cv2.COLOR_BGR2HSV).astype(np.float32)
    oil_hsv[:, :, 1] *= 1.08  # Very subtle saturation boost
    oil_hsv[:, :, 1][oil_hsv[:, :, 1] > 255] = 255
    
    # Minimal vibrance adjustment
    vibrance = 0.3
    V = np.max(oil_hsv[:, :, :], axis=2)
    S = oil_hsv[:, :, 1]
    S = S + (255 - S) * (255 - V) / 255 * vibrance
    oil_hsv[:, :, 1] = np.clip(S, 0, 255)
    
    oil = cv2.cvtColor(oil_hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    
    # Minimal contrast enhancement
    oil = cv2.convertScaleAbs(oil, alpha=1.03, beta=1)
    
    # Restore size
    oil = restore_size(oil, orig_size)
    
    return oil

# ---------------------- Main Processing Function ----------------------
def create_artistic_effect(pil_image, style="cartoon", intensity=1.0, blur=7, edge_threshold=100, variant="medium", max_size=1024):
    """
    Create artistic effects with better performance
    
    Args:
        pil_image: PIL Image input
        style: Effect style ("cartoon", "sketch", "watercolor", "oilpaint")
        intensity: Effect intensity (0.1-2.0)
        blur: Blur amount (1-15)
        edge_threshold: Edge detection threshold (50-200)
        variant: Style variant ("light", "medium", "heavy", etc.)
        max_size: Maximum image dimension for processing (smaller = faster)
    """
    try:
        start_time = time.time()
        img = pil_to_opencv(pil_image)
        
        if style == "cartoon":
            result = create_cartoon_opencv(img, variant, intensity, blur, edge_threshold)
        elif style == "sketch":
            result = create_pencil_sketch_opencv(img, variant, intensity, blur, edge_threshold)
        elif style == "watercolor":
            result = create_watercolor_opencv(img, variant, intensity, blur, edge_threshold)
        elif style == "oilpaint":
            result = create_oilpaint_opencv(img, variant, intensity, blur, edge_threshold)
        else:
            result = create_cartoon_opencv(img, variant, intensity, blur, edge_threshold)
        
        processed_image = opencv_to_pil(result)
        
        print(f"Processing time: {time.time() - start_time:.2f} seconds")
        return processed_image
        
    except Exception as e:
        print(f"Processing failed: {e}")
        return pil_image

# ---------------------- Batch Variant Creator ----------------------
def create_all_variants(pil_image, style="cartoon"):
    """Create all variants of a style efficiently"""
    variants = {}
    variant_names = {
        "cartoon": ["light", "medium", "heavy", "anime"],
        "sketch": ["light", "medium", "dark", "detailed"],
        "watercolor": ["light", "medium", "heavy", "dreamy"],
        "oilpaint": ["subtle", "medium", "heavy", "impressionist"]
    }
    
    for variant in variant_names.get(style, ["medium"]):
        variants[variant] = create_artistic_effect(pil_image, style, variant)
    
    return variants

# ---------------------- Quick Preview Mode ----------------------
def create_quick_preview(pil_image, style="cartoon"):
    """Create a quick preview at lower resolution"""
    # Resize to small for preview
    small_size = 400
    img = pil_image.copy()
    img.thumbnail((small_size, small_size), Image.Resampling.LANCZOS)
    
    return create_artistic_effect(img, style, "medium", max_size=400)

