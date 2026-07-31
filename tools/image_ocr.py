# image_ocr.py - Image text extraction using OCR.space API
"""
Image OCR tool for extracting text from screenshots and images.
Usage: python image_ocr.py <image_path>
"""

import sys
import os
import json
import base64
import urllib.request
import urllib.parse

def extract_text_from_image(image_path):
    """Extract text from image using available methods"""
    
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return None
    
    print(f"Processing: {image_path}")
    
    # Method 1: Try pytesseract if available
    try:
        import pytesseract
        from PIL import Image
        
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        
        if text.strip():
            print(f"Extracted {len(text)} characters using Tesseract OCR")
            return {
                "text": text,
                "method": "tesseract",
                "confidence": "high"
            }
    except ImportError:
        print("pytesseract not available")
    except Exception as e:
        print(f"Tesseract error: {e}")
    
    # Method 2: Try OCR.space API
    try:
        print("Trying OCR.space API...")
        api_key = os.environ.get('OCR_SPACE_API_KEY', 'K86542147888957')
        
        # For PDF files, we need to convert to image first or use different approach
        if image_path.lower().endswith('.pdf'):
            print("PDF detected - trying to extract via OCR.space PDF endpoint...")
            # OCR.space supports direct PDF upload
            url = "https://api.ocr.space/parse/image"
            
            with open(image_path, 'rb') as f:
                import io
                data = f.read()
                encoded = base64.b64encode(data).decode()
            
            payload = {
                'apikey': api_key,
                'base64Image': f'data:application/pdf;base64,{encoded}',
                'language': 'eng',
                'isOverlayRequired': False,
                'filetype': 'PDF'
            }
        else:
            # Image file
            url = "https://api.ocr.space/parse/image"
            
            with open(image_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode()
            
            payload = {
                'apikey': api_key,
                'base64Image': f'data:image/png;base64,{image_data}',
                'language': 'eng',
                'isOverlayRequired': False
            }
        
        data = urllib.parse.urlencode(payload).encode()
        req = urllib.request.Request(url, data=data, method='POST')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
        
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode())
            
            if result.get('ParsedResults'):
                text = result['ParsedResults'][0].get('ParsedText', '')
                if text.strip():
                    print(f"Extracted {len(text)} characters using OCR.space API")
                    return {
                        "text": text,
                        "method": "ocr.space",
                        "confidence": "medium"
                    }
            elif result.get('ErrorMessage'):
                print(f"OCR.space error: {result['ErrorMessage']}")
    except Exception as e:
        print(f"OCR.space error: {e}")
    
    return {
        "text": "",
        "error": "No OCR method succeeded",
        "methods_tried": ["tesseract", "ocr.space"]
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python image_ocr.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = extract_text_from_image(image_path)
    
    if result and result.get('text'):
        print("\n--- EXTRACTED TEXT ---\n")
        print(result['text'][:5000])
        if len(result['text']) > 5000:
            print(f"\n... ({len(result['text']) - 5000} more characters)")
        
        # Save to file
        output_path = image_path.replace('.pdf', '_ocr.txt').replace('.png', '_ocr.txt').replace('.jpg', '_ocr.txt').replace('.jpeg', '_ocr.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result['text'])
        print(f"\nSaved to: {output_path}")
    else:
        print("\nCould not extract text from image")
        if result and result.get('error'):
            print(f"Error: {result['error']}")