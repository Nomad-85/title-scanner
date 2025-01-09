import sharp from 'sharp';

interface PreprocessingOptions {
  contrast?: number;      // 1-100, default: 50
  threshold?: number;     // 0-255, default: 128
  denoiseLevel?: number; // 0-100, default: 30
  rotationCorrection?: boolean; // default: true
}

export async function preprocessImage(
  imageBuffer: Buffer,
  options: PreprocessingOptions = {}
): Promise<Buffer> {
  const {
    contrast = 50,
    threshold = 128,
    denoiseLevel = 30,
    rotationCorrection = true
  } = options;

  let pipeline = sharp(imageBuffer)
    // Convert to grayscale
    .grayscale()
    // Increase contrast
    .linear(contrast / 50, -(contrast / 2))
    // Remove noise
    .median(Math.ceil(denoiseLevel / 10))
    // Normalize
    .normalize()
    // Threshold to create black and white image
    .threshold(threshold);

  if (rotationCorrection) {
    // Detect and correct rotation
    const { angle } = await pipeline.rotate().metadata();
    if (angle && angle !== 0) {
      pipeline = pipeline.rotate(-angle);
    }
  }

  // Sharpen edges
  pipeline = pipeline.sharpen({
    sigma: 1.5,
    m1: 1.5,
    m2: 2.0,
    x1: 2,
    y2: 10,
    y3: 20
  });

  return pipeline.toBuffer();
}

export async function extractVinRegion(
  imageBuffer: Buffer,
  vinPattern: RegExp = /[A-HJ-NPR-Z0-9]{17}/
): Promise<{ region: Buffer; coordinates: { x: number; y: number; width: number; height: number } } | null> {
  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const { width = 0, height = 0 } = metadata;

    // Create regions of interest (common VIN locations)
    const regions = [
      // Top third of the document
      { x: 0, y: 0, width, height: Math.floor(height / 3) },
      // Middle third
      { x: 0, y: Math.floor(height / 3), width, height: Math.floor(height / 3) },
      // Right half of top third (common location)
      { x: Math.floor(width / 2), y: 0, width: Math.floor(width / 2), height: Math.floor(height / 3) }
    ];

    // Process each region
    for (const region of regions) {
      const regionBuffer = await sharp(imageBuffer)
        .extract(region)
        .toBuffer();

      // Additional processing for the region
      const processedRegion = await preprocessImage(regionBuffer, {
        contrast: 70,
        threshold: 128,
        denoiseLevel: 20
      });

      // If VIN is found in this region, return it
      // Note: You'll need to implement actual OCR check here
      // This is a placeholder for the concept
      return {
        region: processedRegion,
        coordinates: region
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting VIN region:', error);
    return null;
  }
} 