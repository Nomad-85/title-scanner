# VIN Extractor

A web application that extracts Vehicle Identification Numbers (VINs) from PDF scans of vehicle state titles using OCR technology.

## Features

- PDF file upload with drag-and-drop support
- Automatic VIN detection and extraction
- Real-time processing status and progress tracking
- VIN validation according to ISO 3779 standard
- Manual review and correction interface
- Excel export of extracted VINs
- Multi-page PDF support
- Error handling and validation feedback

## Tech Stack

- **Frontend Framework**: Next.js 13 with React
- **Styling**: Tailwind CSS
- **File Upload**: FilePond
- **PDF Processing**: pdf-lib
- **OCR Engine**: Tesseract.js
- **Image Processing**: Sharp
- **Spreadsheet Generation**: SheetJS

## Prerequisites

- Node.js (v14 or later)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vin-extractor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
src/
├── app/
│ ├── layout.tsx # Root layout
│ ├── page.tsx # Main page component
│ └── api/
│ └── process/ # PDF processing endpoint
│ └── route.ts
├── components/
│ ├── LoadingState.tsx # Loading indicator
│ ├── ProgressBar.tsx # Progress tracking
│ ├── ResultsTable.tsx # VIN results display
│ └── VINReviewModal.tsx # Manual review interface
├── types/
│ └── index.ts # TypeScript definitions
└── utils/
├── errorHandling.ts # Error management
├── imageProcessing.ts # Image optimization
└── vinValidation.ts # VIN validation logic

## Usage

1. Launch the application in your web browser.
2. Drag and drop a PDF file containing vehicle titles, or click to browse.
3. Wait for the processing to complete.
4. Review the extracted VINs in the results table.
5. Click "Review" on any VIN to manually verify or correct it.
6. Download the results as an Excel file.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env.local` file in the root directory:

## Error Handling

The application includes comprehensive error handling for:
- Invalid file types
- File size limits
- PDF processing errors
- OCR failures
- VIN validation
- Timeout handling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Tesseract.js](https://github.com/naptha/tesseract.js) for OCR capabilities
- [pdf-lib](https://github.com/Hopding/pdf-lib) for PDF processing
- [FilePond](https://pqina.nl/filepond/) for file upload handling
- [Sharp](https://sharp.pixelplumbing.com/) for image processing

