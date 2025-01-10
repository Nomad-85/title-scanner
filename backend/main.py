from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pdf2image import convert_from_bytes
import pytesseract
import cv2
import numpy as np
import re
import base64
from io import BytesIO
import os
import sys
from typing import Optional
from pdf2image.exceptions import PDFPageCountError

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.vercel.app",
        "http://localhost:3000"  # Keep for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure paths for Windows
if os.name == 'nt':  # Windows
    # Update Tesseract path
    pytesseract.pytesseract.tesseract_cmd = r'C:\Users\tmoses\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'
    
    # Update Poppler path - store full paths to required executables
    poppler_path = r'C:\Users\tmoses\AppData\Local\Programs\poppler-24.08.0\Library\bin'
    
    # Verify poppler executables exist
    required_files = ['pdftocairo.exe', 'pdfinfo.exe']
    for file in required_files:
        full_path = os.path.join(poppler_path, file)
        if not os.path.exists(full_path):
            print(f"WARNING: Required Poppler file not found: {full_path}")
    
    # Add Poppler to system PATH if not already there
    if poppler_path not in os.environ['PATH']:
        os.environ['PATH'] = f"{poppler_path};{os.environ['PATH']}"
    
    # Also set the path for pdf2image
    os.environ['POPPLER_PATH'] = poppler_path

# Add debug logging
print("\nEnvironment Setup:")
print(f"Tesseract command: {pytesseract.pytesseract.tesseract_cmd}")
print(f"Poppler path: {poppler_path}")
print(f"POPPLER_PATH env var: {os.environ.get('POPPLER_PATH')}")
print("\nVerifying Poppler installation:")
try:
    import subprocess
    result = subprocess.run([os.path.join(poppler_path, 'pdfinfo.exe'), '-v'], 
                          capture_output=True, text=True)
    print(f"Poppler version check: {result.stdout or result.stderr}")
except Exception as e:
    print(f"Failed to verify Poppler installation: {str(e)}")

def validate_vin(vin: str) -> bool:
    """Validate Tesla VIN"""
    if not vin.startswith(('5YJ', '7SA')):
        return False
    
    # VIN validation logic here
    weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2]
    transliterations = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
        'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
    }
    
    if len(vin) != 17:
        return False
        
    try:
        # Convert characters to numbers
        values = [int(transliterations.get(c, c)) for c in vin]
        # Calculate check digit
        check_sum = sum(w * v for w, v in zip(weights, values))
        check_digit = check_sum % 11
        check_digit = 'X' if check_digit == 10 else str(check_digit)
        return check_digit == vin[8]
    except:
        return False

def process_image(image):
    """Process image for better OCR results"""
    # Check if image is already grayscale
    if len(image.shape) == 2 or (len(image.shape) == 3 and image.shape[2] == 1):
        gray = image
    else:
        # Convert to grayscale only if image is in color
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    print(f"Image shape before processing: {image.shape}")
    print(f"Image type before processing: {image.dtype}")
    
    # Apply thresholding
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Apply denoising
    denoised = cv2.fastNlMeansDenoising(thresh)
    
    # Increase contrast
    contrast = cv2.convertScaleAbs(denoised, alpha=1.5, beta=0)
    
    return contrast

def extract_vin(image) -> list:
    """Extract VIN from image"""
    try:
        # Process image
        print(f"Input image shape: {image.shape}")
        print(f"Input image type: {image.dtype}")
        processed_image = process_image(image)
        print(f"Processed image shape: {processed_image.shape}")
        
        # Configure Tesseract
        custom_config = r'--oem 1 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHJKLMNPRSTUVWXYZ'
        
        # Perform OCR
        text = pytesseract.image_to_string(processed_image, config=custom_config)
        print(f"Extracted text: {text}")
        
        # Look for Tesla VINs
        tesla_pattern = r'(5YJ|7SA)[A-HJ-NPR-Z0-9]{14}'
        potential_vins = re.finditer(tesla_pattern, text)
        
        valid_vins = []
        for match in potential_vins:
            vin = match.group()
            if validate_vin(vin):
                valid_vins.append(vin)
        
        return valid_vins
    except Exception as e:
        print(f"Error in extract_vin: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise

def image_to_base64(image) -> str:
    """Convert OpenCV image to base64 string with thumbnail generation"""
    # Calculate thumbnail size (maintaining aspect ratio)
    height, width = image.shape[:2]
    max_thumb_size = 300  # Maximum thumbnail width/height
    scale = max_thumb_size / max(width, height)
    thumb_size = (int(width * scale), int(height * scale))
    
    # Create thumbnail
    thumbnail = cv2.resize(image, thumb_size, interpolation=cv2.INTER_AREA)
    
    # Convert to base64
    _, buffer = cv2.imencode('.png', thumbnail)
    return f"data:image/png;base64,{base64.b64encode(buffer).decode()}"

@app.post("/api/process")
async def process_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        try:
            # Convert PDF to images
            images = convert_from_bytes(
                contents,
                dpi=300,
                poppler_path=poppler_path,
                use_pdftocairo=True,
                strict=False
            )
            
            print(f"Successfully converted PDF. Got {len(images)} pages")
            
            all_results = []
            processed_images = []
            
            # Process each page
            for page_num, image in enumerate(images, 1):
                try:
                    print(f"\nProcessing page {page_num}")
                    page_array = np.array(image)
                    
                    processed_image = process_image(page_array)
                    vins = extract_vin(processed_image)
                    
                    # Convert processed image to base64 for preview
                    image_base64 = image_to_base64(processed_image)
                    
                    # Store results for this page
                    for vin in vins:
                        all_results.append({
                            "pageNumber": page_num,
                            "vin": vin,
                            "confidence": 0.95
                        })
                    
                    # Always add the processed image
                    processed_images.append({
                        "pageNumber": page_num,
                        "image": image_base64
                    })
                    
                except Exception as page_err:
                    print(f"Error processing page {page_num}: {str(page_err)}")
                    continue
            
            return {
                "success": True,
                "vins": all_results,
                "processedImages": processed_images  # Make sure this is included in response
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Processing error",
                    "error": str(e)
                }
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to process request",
                "error": str(e)
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)