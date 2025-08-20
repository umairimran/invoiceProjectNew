import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import DocumentManager from '../../../../components/DocumentManager';
import { jobsAPI } from '../../../../utils/api';


const folderTypeNames = {
  'agency_invoice': 'Agency Invoice',
  'approved_quotation': 'Approved Quotation',
  'job_order': 'Job Order',
  'timesheet': 'Timesheet',
  'third_party': 'Third Party',
  'performance_proof': 'Performance Proof',
};

export default function JobDocumentsPage() {
  const router = useRouter();
  const { jobId, folderType } = router.query;
  
  const [documents, setDocuments] = useState([]);
  const [jobTitle, setJobTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch documents for the specific job and folder type
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!jobId || !folderType) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const jobData = await jobsAPI.getById(jobId);
        
        if (jobData) {
          setJobTitle(jobData.title || 'Untitled Job');
          // Get documents from job checklist
          if (jobData.checklist && jobData.checklist[folderType]) {
            setDocuments(jobData.checklist[folderType]);
          } else {
            setDocuments([]);
          }
        } else {
          setError('Job not found.');
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError(`Failed to load documents: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [jobId, folderType]);

  const handleUpload = async (file) => {
    try {
      const newDocument = await jobsAPI.uploadDocumentToJob(jobId, folderType, file);
      setDocuments(prevDocs => [...prevDocs, newDocument]);
      return newDocument;
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  const handleDelete = async (documentIndex) => {
    try {
      await jobsAPI.deleteDocumentFromJob(jobId, folderType, documentIndex);
      setDocuments(prevDocs => prevDocs.filter((_, index) => index !== documentIndex));
    } catch (err) {
      console.error('Delete error:', err);
      throw err;
    }
  };

  const folderName = folderType ? folderTypeNames[folderType] || folderType : '';

  return (
    <Layout title={`${folderName} Documents | Job Details`}>
      {/* Back Button */}
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-secondary hover:bg-secondary/90 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <i className="fas fa-arrow-left mr-3 text-lg"></i>
          <span>Back to Job</span>
        </button>
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="title">{folderName} Documents</h1>
        <p className="subtitle">Manage documents for {jobTitle}</p>
      </div>

      {/* Document Manager Card */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
            <p className="font-helvetica">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <i className="fas fa-exclamation-triangle text-secondary text-2xl mb-2"></i>
            <p className="font-helvetica">{error}</p>
          </div>
        ) : (
          <DocumentManager 
            documents={documents}
            folderType={folderType}
            jobId={jobId}
            onUpload={handleUpload}
            onDelete={handleDelete}
          />
        )}
      </div>
    </Layout>
  );
}
