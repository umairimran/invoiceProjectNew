import React, { useState, useRef } from 'react';

const DocumentManager = ({ 
  documents = [], 
  folderType,
  jobId,
  onUpload,
  onDelete 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadError('');
    setUploadProgress({});
    
    try {
      // Upload files one by one to show progress
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [i]: { file: file.name, status: 'uploading' } }));
        
        try {
          if (onUpload) {
            await onUpload(file, folderType);
            setUploadProgress(prev => ({ ...prev, [i]: { file: file.name, status: 'success' } }));
          }
        } catch (err) {
          console.error(`Error uploading file ${file.name}:`, err);
          setUploadProgress(prev => ({ ...prev, [i]: { file: file.name, status: 'error', error: err.message } }));
          setUploadError(`Failed to upload ${file.name}: ${err.message}`);
        }
      }
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Clear progress after a delay
      setTimeout(() => setUploadProgress({}), 3000);
    }
  };

  const handleDeleteClick = (documentIndex, document) => {
    setDocumentToDelete({ index: documentIndex, document });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    
    try {
      if (onDelete) {
        await onDelete(documentToDelete.index, folderType);
      }
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document: ' + err.message);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDocumentToDelete(null);
  };

  const handleDownload = (doc) => {
    // Guard for non-browser environments
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    // Use stored filename for URL, but prefer original name for download attribute
    const storedFilename = doc.file_path.split('/').pop();
    const suggestedName = doc.original_filename || storedFilename;

    // Create download URL; request as attachment and pass original name when available
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const asNameParam = encodeURIComponent(suggestedName);
    const downloadUrl = `${baseUrl}/files/${storedFilename}?download=true&as_name=${asNameParam}`;

    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = suggestedName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUploadStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <i className="fas fa-spinner fa-spin text-blue-500"></i>;
      case 'success':
        return <i className="fas fa-check text-green-500"></i>;
      case 'error':
        return <i className="fas fa-times text-red-500"></i>;
      default:
        return null;
    }
  };

  const getUploadStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Uploaded successfully';
      case 'error':
        return 'Upload failed';
      default:
        return '';
    }
  };

  return (
    <div className="document-manager">
      <div className="mb-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          id={`file-upload-${folderType}`}
          disabled={uploading}
          multiple // Enable multiple file selection
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt" // Common document formats
        />
        <label
          htmlFor={`file-upload-${folderType}`}
          className={`px-6 py-3 font-helvetica font-medium text-white ${uploading ? 'bg-gray-400' : 'bg-secondary'} rounded-lg hover:bg-secondary/90 transition-all duration-200 shadow-md cursor-pointer inline-flex items-center`}
        >
          {uploading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Uploading...
            </>
          ) : (
            <>
              <i className="fas fa-upload mr-2"></i>
              Upload Documents
            </>
          )}
        </label>
        <p className="text-sm text-gray-500 mt-2">
          You can select multiple files at once. Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, TXT
        </p>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mb-4 space-y-2">
          {Object.entries(uploadProgress).map(([key, progress]) => (
            <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${
              progress.status === 'success' ? 'border-green-200 bg-green-50' :
              progress.status === 'error' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-center space-x-3">
                {getUploadStatusIcon(progress.status)}
                <span className="text-sm font-medium">{progress.file}</span>
              </div>
              <span className={`text-sm ${
                progress.status === 'success' ? 'text-green-600' :
                progress.status === 'error' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {getUploadStatusText(progress.status)}
              </span>
              {progress.status === 'error' && progress.error && (
                <span className="text-xs text-red-500 ml-2">{progress.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{uploadError}</span>
        </div>
      )}

      {documents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                <th className="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                <th className="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Uploaded</th>
                <th className="py-2 px-4 border-b text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <i className="fas fa-file-alt text-gray-400 mr-2"></i>
                      <span className="text-sm">{doc.original_filename || doc.file_path.split('/').pop()}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.uploaded_by || 'Unknown'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doc.uploaded_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="text-green-600 hover:text-green-900 mr-3 transition-colors duration-200"
                      title="Download document"
                    >
                      <i className="fas fa-download"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(index, doc)}
                      className="text-red-600 hover:text-red-900 transition-colors duration-200"
                      title="Delete document"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 p-8 text-center rounded-lg border border-dashed border-gray-300">
          <i className="fas fa-file-upload text-gray-400 text-3xl mb-2"></i>
          <p className="text-gray-500">No documents uploaded yet</p>
          <p className="text-gray-400 text-sm mt-2">Upload documents using the button above</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Delete Document</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete <span className="font-medium text-gray-900">
                  {documentToDelete?.document?.original_filename || documentToDelete?.document?.file_path?.split('/').pop()}
                </span>?
              </p>
              <p className="text-sm text-gray-400 mt-2">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
