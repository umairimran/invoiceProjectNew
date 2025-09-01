import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { jobsAPI } from '../../utils/api';

export default function JobDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Document checklists
  const checklistFolders = [
    { id: 'agency_invoice', name: 'Agency Invoice', icon: 'fas fa-file-invoice' },
    { id: 'approved_quotation', name: 'Approved Quotation', icon: 'fas fa-file-contract' },
    { id: 'job_order', name: 'Job Order', icon: 'fas fa-tasks' },
    { id: 'timesheet', name: 'Timesheet', icon: 'fas fa-clock' },
    { id: 'third_party', name: 'Third Party', icon: 'fas fa-handshake' },
    { id: 'performance_proof', name: 'Performance Proof', icon: 'fas fa-chart-line' }
  ];

  // Fetch job data function
  const fetchJobData = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const jobData = await jobsAPI.getById(id);
      
      if (jobData) {
        setJob(jobData);
        // Initialize form data with job data
        setFormData({
          ...jobData,
          review: jobData.review || {}
        });
      } else {
        setError('Job not found');
      }
    } catch (err) {
      console.error('Error fetching job data:', err);
      setError(`Failed to load job details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Fetch job data on component mount
  useEffect(() => {
    fetchJobData();
  }, [fetchJobData]);

  // Handle form input change
  const handleInputChange = (e, section = null) => {
    const { name, value } = e.target;
    
    if (section === 'review') {
      setFormData({
        ...formData,
        review: {
          ...formData.review,
          [name]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const updatedJob = await jobsAPI.update(id, formData);
      setJob(updatedJob);
      setIsEditing(false);
      setSuccessMessage('Job updated successfully');
      
      // Automatically refresh job data to show the latest information
      setTimeout(() => {
        fetchJobData();
      }, 1000);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error updating job:', err);
      setError(`Failed to update job: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle AI process
  const handleAIProcess = async () => {
    if (!id) return;
    
    // Check if any documents are uploaded
    const hasDocuments = job?.checklist && Object.values(job.checklist).some(folder => folder && folder.length > 0);
    
    if (!hasDocuments) {
      setError('Please upload your documents first before running AI processing.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Generate review based on missing documents (regardless of AI success/failure)
    const missingItems = [];
    const checklist = job?.checklist || {};
    
    // Check for missing documents
    if (!checklist.agency_invoice || checklist.agency_invoice.length === 0) {
      missingItems.push("1- the agency invoice for 20% has not been attached");
      missingItems.push("2- the agency invoice for 30% has not been attached");
      missingItems.push("3- the agency invoice for 50% has not been attached");
    } else if (checklist.agency_invoice.length === 1) {
      missingItems.push("2- the agency invoice for 30% has not been attached");
      missingItems.push("3- the agency invoice for 50% has not been attached");
    } else if (checklist.agency_invoice.length === 2) {
      missingItems.push("3- the agency invoice for 50% has not been attached");
    }
    
    if (!checklist.approved_quotation || checklist.approved_quotation.length === 0) {
      missingItems.push("4- the approved quotation documents have not been attached");
    } else if (checklist.approved_quotation.length === 1) {
      missingItems.push("5- one approved quotation document is missing");
    }
    
    if (!checklist.job_order || checklist.job_order.length === 0) {
      missingItems.push("6- the job order has not been attached");
    } else if (checklist.job_order.length > 1) {
      missingItems.push("7- multiple job orders found, only one is required");
    }
    
    // Check for Performance Proof (Proof of Ads)
    if (!checklist.performance_proof || checklist.performance_proof.length === 0) {
      missingItems.push("8- the proof of ads (performance proof) has not been attached");
    }
    
    // Generate initial review outcome
    const initialReviewOutcome = missingItems.length > 0 
      ? `Missing or incorrect documents: ${missingItems.join("; ")}`
      : "All required documents are present and valid.";
    
    // Set final review outcome based on missing items
    const finalReviewOutcome = missingItems.length > 0 ? "Not Approved" : "Approved";
    
    try {
      // Try AI processing first
      const updatedJob = await jobsAPI.runAIProcess(id);
      
      // If AI succeeds, merge with our generated review
      const mergedReview = {
        ...updatedJob.review,
        initial_review_outcome: initialReviewOutcome,
        final_review_outcome: finalReviewOutcome
      };
      
      const updatedJobData = {
        ...updatedJob,
        status: finalReviewOutcome === "Approved" ? 'Compliant' : 'Not Compliant',
        review: mergedReview
      };
      
      console.log('Updating job with status:', updatedJobData.status);
      console.log('Final review outcome:', finalReviewOutcome);
      
      // Update the job in the database with the new status and review
      const finalUpdatedJob = await jobsAPI.update(id, updatedJobData);
      
      console.log('Job updated successfully:', finalUpdatedJob);
      console.log('New status from backend:', finalUpdatedJob.status);
      
      setJob(finalUpdatedJob);
      setFormData(finalUpdatedJob);
      setSuccessMessage(`AI processing completed and review generated. Status: ${finalReviewOutcome}`);
      
      // Automatically refresh job data to show the latest information
      setTimeout(() => {
        fetchJobData();
      }, 1000);
    } catch (err) {
      console.error('Error running AI process:', err);
      
      // If AI fails, just use our generated review
      const updatedJobData = {
        ...formData,
        status: finalReviewOutcome === "Approved" ? 'Compliant' : 'Not Compliant',
        review: {
          ...formData?.review,
          initial_review_outcome: initialReviewOutcome,
          final_review_outcome: finalReviewOutcome
        }
      };
      
      console.log('AI failed, updating job with status:', updatedJobData.status);
      console.log('Final review outcome:', finalReviewOutcome);
      
      try {
        const updatedJob = await jobsAPI.update(id, updatedJobData);
        console.log('Job updated successfully (AI failed case):', updatedJob);
        console.log('New status from backend (AI failed case):', updatedJob.status);
        
        setJob(updatedJob);
        setFormData(updatedJobData);
        setSuccessMessage(`Review generated based on available documents. Status: ${finalReviewOutcome}`);
        
        // Automatically refresh job data to show the latest information
        setTimeout(() => {
          fetchJobData();
        }, 1000);
      } catch (updateErr) {
        console.error('Error updating job with review:', updateErr);
        setError('Failed to update job with review data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle job approval
  const handleApproval = async (approved) => {
    try {
      // Get the current final review outcome from the job data
      const finalReviewOutcome = job?.review?.final_review_outcome || formData?.review?.final_review_outcome;
      
      // Determine status based on Final Review Outcome
      let newStatus;
      if (finalReviewOutcome === "Approved") {
        newStatus = 'Compliant';
      } else if (finalReviewOutcome === "Not Approved") {
        newStatus = 'Not Compliant';
      } else {
        // Default behavior if final review outcome is not set
        newStatus = job?.status || 'pending';
      }
      
      const updatedData = {
        ...formData,
        status: newStatus
      };
      
      const updatedJob = await jobsAPI.update(id, updatedData);
      setJob(updatedJob);
      setFormData(updatedJob);
      
      const statusMessage = finalReviewOutcome === "Approved" ? 'marked as Compliant' : 
                           finalReviewOutcome === "Not Approved" ? 'marked as Not Compliant' : 
                           'updated';
      setSuccessMessage(`Job ${statusMessage} successfully`);
      
      // Automatically refresh job data to show the latest information
      setTimeout(() => {
        fetchJobData();
      }, 1000);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error updating job status:', err);
      setError(`Failed to update job status: ${err.message}`);
    }
  };

  // Helper to check if a folder has documents
  const hasFolderDocuments = (folderId) => {
    if (!job || !job.checklist || !job.checklist[folderId]) {
      return false;
    }
    return job.checklist[folderId].length > 0;
  };

  // Date formatter helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD for input fields
  };

  return (
    <Layout title={job ? `${job.title} | Job Details` : 'Job Details'}>
      {/* Back Button */}
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-secondary hover:bg-secondary/90 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <i className="fas fa-arrow-left mr-3 text-lg"></i>
          <span>Back</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="card p-8 text-center">
          <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">Loading job details...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <i className="fas fa-exclamation-triangle text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">{error}</p>
          <button 
            onClick={() => router.back()}
            className="btn btn-secondary mt-4"
          >
            Go Back
          </button>
        </div>
      ) : job ? (
        <div className="space-y-8">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}

          {/* Job Status Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="title">Job Status</h2>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                job.status === 'Compliant' 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                <i className={`mr-2 ${
                  job.status === 'Compliant' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'
                }`}></i>
                {job.status}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Current Status:</strong> {job.status}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Last Updated:</strong> {new Date(job.updated_at).toLocaleString()}
              </p>
              {job.review?.final_review_outcome && (
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Review Outcome:</strong> {job.review.final_review_outcome}
                </p>
              )}
            </div>
          </div>

          {/* Document Checklist Section */}
          <div className="card">
            <h2 className="title mb-6">Document Checklist</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {checklistFolders.map((folder) => (
                <div 
                  key={folder.id}
                  className={`border ${hasFolderDocuments(folder.id) ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'} rounded-lg p-6 transition-all hover:shadow-md`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <i className={`${folder.icon} text-lg ${hasFolderDocuments(folder.id) ? 'text-green-600' : 'text-red-600'} mr-3`}></i>
                      <h3 className="font-helveticaBold text-lg">{folder.name}</h3>
                    </div>
                    <div>
                      {hasFolderDocuments(folder.id) ? (
                        <span className="bg-green-100 text-green-800 text-xs font-medium py-1 px-2 rounded-full">
                          <i className="fas fa-check mr-1"></i>
                          Uploaded
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-xs font-medium py-1 px-2 rounded-full">
                          <i className="fas fa-times mr-1"></i>
                          Missing
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    {hasFolderDocuments(folder.id) ? (
                      <div>
                        {job.checklist[folder.id].map((doc, index) => (
                          <div key={index} className="text-sm flex items-center mb-1 text-gray-600">
                            <i className="fas fa-file mr-2"></i>
                            <span className="truncate">{doc.original_filename || doc.file_path.split('/').pop()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No documents uploaded yet</p>
                    )}
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      className="btn btn-secondary text-sm py-1 px-3"
                      onClick={() => router.push(`/jobs/${id}/documents/${folder.id}`)}
                    >
                      <i className="fas fa-upload mr-1"></i>
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agency Invoice Tracking Form */}
          <form onSubmit={handleSubmit} className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="title">Agency Invoice Tracking</h2>
              <div className="space-x-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(job);
                        setIsEditing(false);
                      }}
                      className="btn bg-gray-500 text-white hover:bg-gray-600"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-3 font-helvetica font-medium text-white bg-secondary hover:bg-secondary/90 rounded-lg transition-all duration-200 shadow-md inline-flex items-center"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Edit Details
                  </button>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-8">
              {/* Identifiers Group */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="font-helveticaBold text-lg mb-4 text-gray-700">Identifiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Market/BU</label>
                    <input type="text" name="market_bu" value={formData?.review?.market_bu || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Agency Invoice Number</label>
                    <input type="text" name="agency_invoice_number" value={formData?.review?.agency_invoice_number || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">PO #</label>
                    <input type="text" name="po_number" value={formData?.review?.po_number || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Period / Month</label>
                    <input type="text" name="period_month" value={formData?.review?.period_month || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" placeholder="e.g. Nov-23" />
                  </div>
                </div>
              </div>

              {/* Timeline Group */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="font-helveticaBold text-lg mb-4 text-gray-700">Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Date Invoice Sent to MEDPUSH</label>
                    <input type="date" name="date_invoice_sent_to_medpush" value={formatDate(formData?.review?.date_invoice_sent_to_medpush)} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Date MEDPUSH Shared Feedback</label>
                    <input type="date" name="date_medpush_shared_feedback" value={formatDate(formData?.review?.date_medpush_shared_feedback)} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Date Agency Responded</label>
                    <input type="date" name="date_agency_responded_to_feedback" value={formatDate(formData?.review?.date_agency_responded_to_feedback)} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Date MEDPUSH Approved Invoice</label>
                    <input type="date" name="date_medpush_approved_invoice" value={formatDate(formData?.review?.date_medpush_approved_invoice)} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                </div>
              </div>

              {/* Financials Group */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="font-helveticaBold text-lg mb-4 text-gray-700">Financials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Medium</label>
                    <input type="text" name="medium" value={formData?.review?.medium || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Campaign Name</label>
                    <input type="text" name="campaign_name" value={formData?.review?.campaign_name || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Net Media Cost</label>
                    <input type="number" name="net_media_cost" value={formData?.review?.net_media_cost || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Agency Fee</label>
                    <input type="number" name="agency_fee" value={formData?.review?.agency_fee || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Taxes</label>
                    <input type="number" name="taxes" value={formData?.review?.taxes || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Other 3rd Party Fee/Cost</label>
                    <input type="number" name="other_third_party_cost" value={formData?.review?.other_third_party_cost || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Agency Invoice Total Amount</label>
                    <input type="number" name="agency_invoice_total_amount" value={formData?.review?.agency_invoice_total_amount || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Media Plan Total Amount</label>
                    <input type="number" name="media_plan_total_amount" value={formData?.review?.media_plan_total_amount || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">PO Amount (With Agency Fee)</label>
                    <input type="number" name="po_amount_with_af" value={formData?.review?.po_amount_with_af || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100" />
                  </div>
                </div>
              </div>

              {/* Review Outcomes Group */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="font-helveticaBold text-lg mb-4 text-gray-700">Review Outcomes</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Initial Review Outcome</label>
                    <textarea name="initial_review_outcome" value={formData?.review?.initial_review_outcome || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} rows="3" className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100"></textarea>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Agency Feedback / Action</label>
                    <textarea name="agency_feedback_action" value={formData?.review?.agency_feedback_action || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} rows="3" className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100"></textarea>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Final Review Outcome</label>
                    <textarea name="final_review_outcome" value={formData?.review?.final_review_outcome || ''} onChange={(e) => handleInputChange(e, 'review')} disabled={!isEditing} rows="3" className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* AI Process Section */}
          <div className="card">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
              <div>
                <h2 className="title mb-2">AI Processing</h2>
                <p className="text-gray-600">Run AI analysis on uploaded documents</p>
              </div>
              <div className="mt-4 md:mt-0">
                <button 
                  onClick={handleAIProcess}
                  className="px-6 py-3 font-helvetica font-medium text-white bg-secondary hover:bg-secondary/90 rounded-lg transition-all duration-200 shadow-md inline-flex items-center"
                >
                  <i className="fas fa-robot mr-2"></i>
                  Run AI Process
                </button>
              </div>
            </div>
            
            {/* Warning message when AI process fails due to no documents */}
            {error && error.includes('upload your documents') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-triangle text-yellow-600 mr-3 text-lg"></i>
                  <div>
                    <h4 className="font-helveticaBold text-yellow-800 text-lg">Upload documents please</h4>
                    <p className="text-yellow-700 text-sm mt-1">Please upload the required documents before proceeding with the AI process.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
