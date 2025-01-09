import { useState, useEffect } from 'react';
import Image from 'next/image';
import { validateVIN } from '@/utils/vinValidation';

interface VINReviewModalProps {
  pageNumber: number;
  originalVin: string;
  confidence: number;
  imageData: string;
  onSave: (pageNumber: number, newVin: string) => void;
  onClose: () => void;
}

export default function VINReviewModal({
  pageNumber,
  originalVin,
  confidence,
  imageData,
  onSave,
  onClose
}: VINReviewModalProps) {
  const [editedVin, setEditedVin] = useState(originalVin);
  const [validation, setValidation] = useState({ isValid: true, errors: [] as string[] });

  useEffect(() => {
    setValidation(validateVIN(editedVin));
  }, [editedVin]);

  const handleSave = () => {
    if (validation.isValid) {
      onSave(pageNumber, editedVin);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Review VIN - Page {pageNumber}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="border rounded p-4 mb-4">
            <Image
              src={`data:image/png;base64,${imageData}`}
              alt={`Page ${pageNumber}`}
              width={800}
              height={400}
              className="object-contain"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidence Score
              </label>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      confidence >= 90 ? 'bg-green-600' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {confidence.toFixed(1)}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VIN
              </label>
              <input
                type="text"
                value={editedVin}
                onChange={(e) => setEditedVin(e.target.value.toUpperCase())}
                className="w-full p-2 border rounded font-mono"
                maxLength={17}
              />
              {!validation.isValid && (
                <div className="mt-2 text-red-500 text-sm">
                  {validation.errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!validation.isValid}
            className={`px-4 py-2 rounded text-white ${
              validation.isValid
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 