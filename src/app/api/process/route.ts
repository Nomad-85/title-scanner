import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { createWorker } from 'tesseract.js';
import { preprocessImage, extractVinRegion } from '@/utils/imageProcessing';
import { validateVIN } from '@/utils/vinValidation';
import { AppError, ErrorCodes, ErrorResponse } from '@/utils/errorHandling';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PROCESSING_TIMEOUT = 30000; // 30 seconds

export async function POST(request: Request) {
  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/pdf')) {
      throw new AppError('Invalid file type. Only PDF files are accepted.', 400, ErrorCodes.INVALID_FILE_TYPE);
    }

    // Check file size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      throw new AppError('File too large. Maximum size is 10MB.', 400, ErrorCodes.FILE_TOO_LARGE);
    }

    const data = await request.arrayBuffer();
    
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(data);
    } catch (error) {
      throw new AppError(
        'Failed to load PDF file. Please ensure the file is not corrupted.',
        400,
        ErrorCodes.PDF_LOAD_ERROR
      );
    }

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new AppError('PDF file is empty.', 400, ErrorCodes.PDF_LOAD_ERROR);
    }

    let worker;
    try {
      worker = await createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: '1',
        preserve_interword_spaces: '1'
      });
    } catch (error) {
      throw new AppError(
        'Failed to initialize OCR engine.',
        500,
        ErrorCodes.OCR_ERROR
      );
    }

    const results = [];
    const pageImages: { [key: number]: string } = {};
    const errors: { page: number; error: string }[] = [];

    // Process pages with timeout
    const processPage = async (pageIndex: number) => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), PROCESSING_TIMEOUT);
      });

      try {
        await Promise.race([
          (async () => {
            const page = pages[pageIndex];
            const pngBytes = await pdfDoc.saveAsBase64({ format: 'png' });
            pageImages[pageIndex + 1] = pngBytes;

            const imageBuffer = Buffer.from(pngBytes, 'base64');
            
            try {
              const vinRegion = await extractVinRegion(imageBuffer);
              const processedImage = await preprocessImage(
                vinRegion?.region || imageBuffer,
                {
                  contrast: 70,
                  threshold: 128,
                  denoiseLevel: vinRegion ? 20 : 30,
                  rotationCorrection: !vinRegion
                }
              );

              const { data } = await worker.recognize(processedImage);
              const vinRegex = /[A-HJ-NPR-Z0-9]{17}/g;
              const matches = data.text.match(vinRegex);

              if (!matches || matches.length === 0) {
                errors.push({
                  page: pageIndex + 1,
                  error: 'No VIN found on this page'
                });
                return;
              }

              const vinMatches = matches.map(match => ({
                vin: match,
                confidence: data.words.find(w => w.text.includes(match))?.confidence || data.confidence,
                box: data.words.find(w => w.text.includes(match))?.bbox
              }));

              const bestMatch = vinMatches.sort((a, b) => b.confidence - a.confidence)[0];
              const validation = validateVIN(bestMatch.vin);

              results.push({
                pageNumber: pageIndex + 1,
                vin: bestMatch.vin,
                confidence: validation.isValid ? bestMatch.confidence : Math.min(bestMatch.confidence, 70),
                validationErrors: validation.errors,
                coordinates: bestMatch.box
              });
            } catch (error) {
              errors.push({
                page: pageIndex + 1,
                error: 'Failed to process page'
              });
            }
          })(),
          timeoutPromise
        ]);
      } catch (error) {
        if (error.message === 'Processing timeout') {
          errors.push({
            page: pageIndex + 1,
            error: 'Page processing timed out'
          });
        } else {
          throw error;
        }
      }
    };

    // Process pages in parallel with a limit
    const CONCURRENT_LIMIT = 3;
    for (let i = 0; i < pages.length; i += CONCURRENT_LIMIT) {
      const pagePromises = pages
        .slice(i, i + CONCURRENT_LIMIT)
        .map((_, index) => processPage(i + index));
      await Promise.all(pagePromises);
    }

    await worker.terminate();

    if (results.length === 0) {
      throw new AppError(
        'No VINs were found in the document.',
        404,
        ErrorCodes.NO_VIN_FOUND
      );
    }

    return NextResponse.json({
      vins: results,
      pageImages,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error processing PDF:', error);

    if (error instanceof AppError) {
      const errorResponse: ErrorResponse = {
        error: {
          message: error.message,
          code: error.errorCode,
        },
        status: error.statusCode
      };
      return NextResponse.json(errorResponse, { status: error.statusCode });
    }

    return NextResponse.json(
      {
        error: {
          message: 'An unexpected error occurred',
          code: ErrorCodes.OCR_ERROR
        },
        status: 500
      },
      { status: 500 }
    );
  }
} 