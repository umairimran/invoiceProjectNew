import React, { useState } from 'react';
import { isExcelOrCsv } from '../utils/helpers';

const AgencyRateCardManager = ({ agency, onUploadRateCard }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      if (!isExcelOrCsv(file.name)) {
        setUploadError('Only Excel (.xlsx, .xls) or CSV (.csv) files are allowed.');
        setSelectedFile(null);
        e.target.value = null;
        return;
      }
      
      setSelectedFile(file);
      setUploadError(null);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const success = await onUploadRateCard(selectedFile);
      
      if (success) {
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('agency-rate-card-upload');
        if (fileInput) fileInput.value = '';
      } else {
        setUploadError('Failed to upload rate card. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading rate card:', error);
      setUploadError('An error occurred while uploading the rate card.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDownload = () => {
    if (!agency.rate_card_file) return;
    
    // Extract filename from path if it's a full path
    const filename = agency.rate_card_file.split('/').pop();
    
    // Create download URL
    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/files/${filename}`;
    
    // Open in new tab
    window.open(downloadUrl, '_blank');
  };
  
  return (
    <div className="card">
      <h2 className="font-signika font-bold text-xl mb-6">Agency Rate Card Template</h2>
      
      {/* Current Status */}
      <div className="mb-8">
        <div className={`p-6 rounded-xl border-2 ${
          agency.rate_card_file 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mr-6 ${
              agency.rate_card_file ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <i className={`fas fa-${agency.rate_card_file ? 'check-circle text-green-600' : 'file-alt text-gray-500'} text-2xl`}></i>
            </div>
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${
                agency.rate_card_file ? 'text-green-800' : 'text-gray-700'
              }`}>
                {agency.rate_card_file ? 'Template Available' : 'No Template Uploaded'}
              </h3>
              {agency.rate_card_file ? (
                <div className="space-y-2">
                  <div className="flex items-center text-green-700">
                    <i className="fas fa-file-excel mr-2"></i>
                    <span className="font-medium">{agency.rate_card_file.split('/').pop()}</span>
                  </div>
                  <p className="text-green-600">Ready for use</p>
                </div>
              ) : (
                <p className="text-gray-600">Upload a rate card template to get started</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-6">
        {/* Download Section - Only show if template exists */}
        {agency.rate_card_file && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <i className="fas fa-download text-blue-600 text-xl"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 text-lg">Download Template</h4>
                  <p className="text-blue-700 text-sm">Get your current rate card template</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center"
                type="button"
              >
                <i className="fas fa-download mr-2"></i>
                Download
              </button>
            </div>
          </div>
        )}
        
        {/* Upload Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                <i className="fas fa-cloud-upload-alt text-gray-600 text-xl"></i>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-lg">
                  {agency.rate_card_file ? 'Replace Template' : 'Upload Template'}
                </h4>
                <p className="text-gray-600 text-sm">
                  {agency.rate_card_file ? 'Upload a new file to replace the current template' : 'Choose your rate card template file'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <label htmlFor="agency-rate-card-upload" className="cursor-pointer">
                <div className="space-y-3">
                  <i className="fas fa-file-upload text-gray-400 text-3xl"></i>
                  <div>
                    <p className="text-gray-600 font-medium">
                      {selectedFile ? selectedFile.name : 'Click to choose file or drag and drop'}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Excel (.xlsx, .xls) or CSV (.csv) files only
                    </p>
                  </div>
                </div>
                <input
                  id="agency-rate-card-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Error Message */}
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center text-red-700">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  <span className="text-sm">{uploadError}</span>
                </div>
              </div>
            )}
            
            {/* Selected File Info */}
            {selectedFile && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-green-700">
                    <i className="fas fa-check-circle mr-2"></i>
                    <span className="text-sm font-medium">File selected: {selectedFile.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      const fileInput = document.getElementById('agency-rate-card-upload');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="text-green-600 hover:text-green-800 text-sm"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            )}
            
            {/* Upload Button */}
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                  agency.rate_card_file 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
                type="button"
              >
                {isUploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Uploading...
                  </>
                ) : agency.rate_card_file ? (
                  <>
                    <i className="fas fa-sync-alt mr-2"></i>
                    Replace Template
                  </>
                ) : (
                  <>
                    <i className="fas fa-upload mr-2"></i>
                    Upload Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyRateCardManager;
