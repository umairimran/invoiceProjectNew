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
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setUploadError('');
    
    try {
      if (onUpload) {
        await onUpload(file, folderType);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError('Failed to upload document: ' + err.message);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (documentIndex) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        if (onDelete) {
          await onDelete(documentIndex, folderType);
        }
      } catch (err) {
        console.error('Error deleting document:', err);
        alert('Failed to delete document: ' + err.message);
      }
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
        />
        <label
          htmlFor={`file-upload-${folderType}`}
          className={`btn ${uploading ? 'bg-gray-400' : 'btn-primary'} cursor-pointer inline-block`}
        >
          {uploading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Uploading...
            </>
          ) : (
            <>
              <i className="fas fa-upload mr-2"></i>
              Upload Document
            </>
          )}
        </label>
      </div>

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
                      onClick={() => window.open(`/api/files/${doc.file_path}`, '_blank')}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-900"
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
    </div>
  );
};

export default DocumentManager;
