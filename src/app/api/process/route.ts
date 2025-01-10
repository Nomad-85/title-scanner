import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { validateVIN } from '@/utils/vinValidation';
import { AppError, ErrorCodes } from '@/utils/errorHandling';
import sharp from 'sharp';
import { initializeWorker } from '@/utils/tesseractWorker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function processPage(pdfDoc: PDFDocument): Promise<{ buffer: Buffer; base64: string }> {
  try {
    // Get the first page
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    // Render page at higher resolution
    const scale = 2.0;
    const pngBytes = await pdfDoc.saveAsBase64({
      pageNumbers: [0],
      width: width * scale,
      height: height * scale
    });

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pngBytes, 'base64');

    // Process with sharp for better OCR results
    const processedBuffer = await sharp(pdfBuffer)
      .toFormat('png')
      .resize(3000, null, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .sharpen({
        sigma: 1.5,
        m1: 1,
        m2: 2
      })
      .normalize()
      .gamma(1.8)
      .modulate({
        brightness: 1.3,
        contrast: 1.4
      })
      .toBuffer();

    // Convert to base64 for preview
    const base64 = `data:image/png;base64,${processedBuffer.toString('base64')}`;

    return {
      buffer: processedBuffer,
      base64
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  let worker = null;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new AppError('No file provided', 400, ErrorCodes.INVALID_FILE_TYPE);
    }

    // Convert file to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Load PDF
    const pdfDoc = await PDFDocument.load(fileBuffer);
    
    // Process the first page
    const { buffer, base64 } = await processPage(pdfDoc);
    console.log('Image processed successfully');

    // Initialize worker with specific configuration for Tesla VINs
    worker = await initializeWorker();
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHJKLMNPRSTUVWXYZ',
      tessedit_ocr_engine_mode: '1',
      tessjs_create_pdf: '0',
      tessjs_create_hocr: '0',
      textord_heavy_nr: '1'
    });

    // Perform OCR
    const { data: { text } } = await worker.recognize(buffer);
    console.log('Extracted text:', text);

    // Look for Tesla VINs
    const teslaPattern = /(5YJ|7SA)[A-HJ-NPR-Z0-9]{14}/g;
    const vinMatches = text.match(teslaPattern) || [];
    console.log('Found potential VINs:', vinMatches);

    const results = [];
    for (const vin of vinMatches) {
      if (validateVIN(vin).isValid) {
        results.push({
          pageNumber: 1,
          vin,
          validationErrors: []
        });
        console.log('Valid Tesla VIN found:', vin);
        break;
      }
    }

    // Cleanup
    if (worker) {
      await worker.terminate();
    }

    return NextResponse.json({
      success: results.length > 0,
      vins: results,
      processedImage: base64,
      ...(results.length === 0 && {
        error: {
          message: 'No valid Tesla VINs found in document',
          code: ErrorCodes.NO_VINS_FOUND
        }
      })
    }, { 
      status: results.length > 0 ? 200 : 404 
    });

  } catch (error) {
    // Cleanup on error
    if (worker) {
      await worker.terminate();
    }
    
    console.error('Processing error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof AppError ? error.message : 'Failed to process file',
        code: error instanceof AppError ? error.errorCode : ErrorCodes.OCR_ERROR
      }
    }, { status: error instanceof AppError ? error.statusCode : 500 });
  }
}
