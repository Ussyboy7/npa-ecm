"""
OCR Service for ECM

This service handles OCR processing of uploaded documents using Tesseract,
including image preprocessing, text extraction, and full-text indexing.
"""

import os
import logging
from typing import Optional, Tuple
from django.conf import settings
from django.core.files.storage import default_storage

try:
    import pytesseract
    from PIL import Image
    import pdf2image
    from pdf2image.exceptions import PDFPageCountError
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    pytesseract = None
    Image = None
    pdf2image = None

logger = logging.getLogger(__name__)


class OCRService:
    """Service for OCR processing of documents"""
    
    def __init__(self):
        self.logger = logger
        self.tesseract_cmd = getattr(settings, 'TESSERACT_CMD', '/usr/bin/tesseract')
        self.ocr_languages = getattr(settings, 'OCR_LANGUAGES', ['eng'])
        
        # Configure Tesseract if available
        if OCR_AVAILABLE:
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
    
    def is_available(self) -> bool:
        """Check if OCR processing is available"""
        return OCR_AVAILABLE and os.path.exists(self.tesseract_cmd)
    
    def extract_text_from_file(self, file_path: str, file_type: str) -> Tuple[Optional[str], bool]:
        """
        Extract text from a file using OCR
        
        Args:
            file_path: Path to the file
            file_type: Type of file (pdf, jpg, png, etc.)
            
        Returns:
            Tuple of (extracted_text, success_flag)
        """
        
        if not self.is_available():
            self.logger.warning("OCR not available - Tesseract not found")
            return None, False
        
        try:
            if file_type.lower() == 'pdf':
                return self._extract_text_from_pdf(file_path)
            elif file_type.lower() in ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp']:
                return self._extract_text_from_image(file_path)
            else:
                self.logger.info(f"OCR not supported for file type: {file_type}")
                return None, False
                
        except Exception as e:
            self.logger.error(f"Error extracting text from {file_path}: {e}")
            return None, False
    
    def _extract_text_from_pdf(self, file_path: str) -> Tuple[Optional[str], bool]:
        """Extract text from PDF file"""
        
        try:
            # Convert PDF to images
            images = pdf2image.convert_from_path(file_path)
            
            extracted_texts = []
            for i, image in enumerate(images):
                try:
                    # Process each page
                    text = self._process_image(image)
                    if text:
                        extracted_texts.append(f"--- Page {i+1} ---\n{text}")
                except Exception as e:
                    self.logger.warning(f"Error processing PDF page {i+1}: {e}")
                    continue
            
            if extracted_texts:
                full_text = "\n\n".join(extracted_texts)
                self.logger.info(f"Successfully extracted text from PDF: {len(images)} pages")
                return full_text, True
            else:
                return None, False
                
        except PDFPageCountError:
            self.logger.error(f"Could not process PDF: {file_path}")
            return None, False
        except Exception as e:
            self.logger.error(f"Error processing PDF {file_path}: {e}")
            return None, False
    
    def _extract_text_from_image(self, file_path: str) -> Tuple[Optional[str], bool]:
        """Extract text from image file"""
        
        try:
            # Open image
            image = Image.open(file_path)
            
            # Process the image
            text = self._process_image(image)
            
            if text:
                self.logger.info(f"Successfully extracted text from image: {file_path}")
                return text, True
            else:
                return None, False
                
        except Exception as e:
            self.logger.error(f"Error processing image {file_path}: {e}")
            return None, False
    
    def _process_image(self, image: Image.Image) -> Optional[str]:
        """Process image for OCR extraction"""
        
        try:
            # Preprocess image for better OCR results
            processed_image = self._preprocess_image(image)
            
            # Extract text using Tesseract
            text = pytesseract.image_to_string(
                processed_image,
                lang='+'.join(self.ocr_languages),
                config='--oem 3 --psm 6'  # Optimal settings for document OCR
            )
            
            # Clean up text
            cleaned_text = self._clean_extracted_text(text)
            
            return cleaned_text if cleaned_text.strip() else None
            
        except Exception as e:
            self.logger.error(f"Error processing image for OCR: {e}")
            return None
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """Preprocess image for better OCR results"""
        
        try:
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if too small (OCR works better on larger images)
            width, height = image.size
            if width < 300 or height < 300:
                scale_factor = max(300 / width, 300 / height)
                new_size = (int(width * scale_factor), int(height * scale_factor))
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Apply basic image enhancement
            # This could be enhanced with more sophisticated preprocessing
            from PIL import ImageEnhance
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.2)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.1)
            
            return image
            
        except Exception as e:
            self.logger.warning(f"Error preprocessing image: {e}")
            return image
    
    def _clean_extracted_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        
        if not text:
            return ""
        
        # Remove excessive whitespace
        lines = [line.strip() for line in text.split('\n')]
        cleaned_lines = []
        
        for line in lines:
            # Skip empty lines but preserve paragraph structure
            if line:
                cleaned_lines.append(line)
            elif cleaned_lines and cleaned_lines[-1]:  # Add empty line only if previous line wasn't empty
                cleaned_lines.append("")
        
        # Join lines and clean up
        cleaned_text = '\n'.join(cleaned_lines)
        
        # Remove excessive spaces
        import re
        cleaned_text = re.sub(r' {2,}', ' ', cleaned_text)
        cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
        
        return cleaned_text.strip()
    
    def get_confidence_score(self, file_path: str, file_type: str) -> Optional[float]:
        """
        Get OCR confidence score for extracted text
        
        Returns average confidence score (0-100) or None if not available
        """
        
        if not self.is_available():
            return None
        
        try:
            if file_type.lower() == 'pdf':
                return self._get_pdf_confidence(file_path)
            elif file_type.lower() in ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp']:
                return self._get_image_confidence(file_path)
            
        except Exception as e:
            self.logger.error(f"Error getting confidence score: {e}")
        
        return None
    
    def _get_pdf_confidence(self, file_path: str) -> Optional[float]:
        """Get confidence score for PDF"""
        
        try:
            images = pdf2image.convert_from_path(file_path)
            confidences = []
            
            for image in images:
                confidence = self._get_image_confidence_from_object(image)
                if confidence is not None:
                    confidences.append(confidence)
            
            return sum(confidences) / len(confidences) if confidences else None
            
        except Exception as e:
            self.logger.error(f"Error getting PDF confidence: {e}")
            return None
    
    def _get_image_confidence(self, file_path: str) -> Optional[float]:
        """Get confidence score for image file"""
        
        try:
            image = Image.open(file_path)
            return self._get_image_confidence_from_object(image)
        except Exception as e:
            self.logger.error(f"Error getting image confidence: {e}")
            return None
    
    def _get_image_confidence_from_object(self, image: Image.Image) -> Optional[float]:
        """Get confidence score from PIL Image object"""
        
        try:
            processed_image = self._preprocess_image(image)
            
            # Get detailed OCR data including confidence
            data = pytesseract.image_to_data(
                processed_image,
                lang='+'.join(self.ocr_languages),
                config='--oem 3 --psm 6',
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate average confidence
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            
            if confidences:
                return sum(confidences) / len(confidences)
            else:
                return 0.0
                
        except Exception as e:
            self.logger.error(f"Error getting confidence from image object: {e}")
            return None
    
    def extract_metadata_from_text(self, text: str) -> dict:
        """
        Extract metadata from OCR text for document classification
        
        This can be enhanced with more sophisticated NLP processing
        """
        
        metadata = {
            'word_count': len(text.split()) if text else 0,
            'char_count': len(text) if text else 0,
            'line_count': len([line for line in text.split('\n') if line.strip()]) if text else 0,
        }
        
        if text:
            # Simple keyword extraction for document classification
            text_lower = text.lower()
            
            # Document type indicators
            if any(keyword in text_lower for keyword in ['memo', 'memorandum', 'internal memo']):
                metadata['likely_type'] = 'memo'
            elif any(keyword in text_lower for keyword in ['report', 'annual report', 'monthly report']):
                metadata['likely_type'] = 'report'
            elif any(keyword in text_lower for keyword in ['invoice', 'bill', 'payment']):
                metadata['likely_type'] = 'invoice'
            elif any(keyword in text_lower for keyword in ['contract', 'agreement', 'terms']):
                metadata['likely_type'] = 'contract'
        
        return metadata


# Global OCR service instance
ocr_service = OCRService()


def process_document_ocr(document_instance) -> bool:
    """
    Process OCR for a document instance
    
    This function can be called from Celery tasks or directly
    """
    
    try:
        if not ocr_service.is_available():
            document_instance.ocr_text = ""
            document_instance.save(update_fields=['ocr_text'])
            return False
        
        # Get file path
        file_path = document_instance.file.path
        
        # Extract text
        extracted_text, success = ocr_service.extract_text_from_file(
            file_path, 
            document_instance.file_type
        )
        
        if success and extracted_text:
            # Update document with OCR text
            document_instance.ocr_text = extracted_text
            document_instance.save(update_fields=['ocr_text'])
            
            # Update search vector will be handled by signals
            logger.info(f"OCR completed for document {document_instance.id}")
            return True
        else:
            document_instance.ocr_text = ""
            document_instance.save(update_fields=['ocr_text'])
            logger.warning(f"OCR failed for document {document_instance.id}")
            return False
            
    except Exception as e:
        logger.error(f"Error processing OCR for document {document_instance.id}: {e}")
        return False
