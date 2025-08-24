import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { agenciesAPI, jobsAPI } from '../../../utils/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function DetailedInvoiceReviewPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [agency, setAgency] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const fetchAgencyData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch agency details
        const agencyData = await agenciesAPI.getByCode(id);
        setAgency(agencyData);
        
        // Only fetch jobs if we successfully got the agency
        if (agencyData) {
          // Fetch jobs for this agency
          const jobsData = await jobsAPI.getByAgency(id);
          
          // Filter out jobs with no review data
          const filteredJobs = Array.isArray(jobsData) ? jobsData.filter(job => {
            if (!job.review) return false;
            
            // Check if any review field has meaningful data
            const hasData = Object.values(job.review).some(value => 
              value !== null && value !== undefined && value !== '' && value !== 0
            );
            
            return hasData;
          }) : [];
          
          setJobs(filteredJobs);
        }
      } catch (err) {
        console.error('Error fetching agency data:', err);
        if (err.message.includes('not found') || err.message.includes('404')) {
          setError('Agency not found. Please check the agency code and try again.');
        } else {
          setError(`Failed to load agency details: ${err.message}`);
        }
        setAgency(null);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Fetch agency details and related data
  useEffect(() => {
    fetchAgencyData();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const generatePDF = async () => {
    if (!agency || jobs.length === 0) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Calculate available page width (landscape A4: 297mm - margins)
      const pageWidth = 297;
      const leftMargin = 10;
      const rightMargin = 10;
      const availableWidth = pageWidth - leftMargin - rightMargin;
      
      // Simple, clean header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38); // Red color matching the theme
      doc.text('Medpush X MEDPUSH', 140, 20, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128);
      doc.text('Detailed Invoice Review Report', 140, 30, { align: 'center' });
      
      // Agency info - simple and clean
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Agency: ${agency.name}`, 20, 40);
      doc.text(`Code: ${agency.agency_code}`, 20, 45);
      doc.text(`Total Jobs: ${jobs.length}`, 20, 50);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55);
      
      // Summary stats on the right
      const totalInvoiceAmount = jobs.reduce((sum, job) => 
        sum + (job.review?.agency_invoice_total_amount || 0), 0
      );
      const totalMediaCost = jobs.reduce((sum, job) => 
        sum + (job.review?.net_media_cost || 0), 0
      );
      const totalAgencyFee = jobs.reduce((sum, job) => 
        sum + (job.review?.agency_fee || 0), 0
      );
      
      doc.text('Summary:', 200, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total: ${formatCurrency(totalInvoiceAmount)}`, 200, 45);
      doc.text(`Media: ${formatCurrency(totalMediaCost)}`, 200, 50);
      doc.text(`Fees: ${formatCurrency(totalAgencyFee)}`, 200, 55);
      
      // Define table columns
      const columns = [
        'BU/Markets',
        'Agency Invoice #',
        'PO #',
        'Period/Month',
        'Invoice Sent Date',
        'Feedback Date',
        'Response Date',
        'Approval Date',
        'Medium',
        'Campaign Name',
        'Net Media Cost',
        'Agency Fee',
        'Taxes',
        '3rd Party Cost',
        'Invoice Total',
        'Media Plan Total',
        'PO Amount W/ AF',
        'Initial Outcome',
        'Agency Action',
        'Final Outcome'
      ];
      
      // Prepare table data
      const tableData = jobs.map(job => [
        job.review?.market_bu || '-',
        job.review?.agency_invoice_number || '-',
        job.review?.po_number || '-',
        job.review?.period_month || '-',
        formatDate(job.review?.date_invoice_sent_to_medpush),
        formatDate(job.review?.date_medpush_shared_feedback),
        formatDate(job.review?.date_agency_responded_to_feedback),
        formatDate(job.review?.date_medpush_approved_invoice),
        job.review?.medium || '-',
        job.review?.campaign_name || '-',
        formatCurrency(job.review?.net_media_cost),
        formatCurrency(job.review?.agency_fee),
        formatCurrency(job.review?.taxes),
        formatCurrency(job.review?.other_third_party_cost),
        formatCurrency(job.review?.agency_invoice_total_amount),
        formatCurrency(job.review?.media_plan_total_amount),
        formatCurrency(job.review?.po_amount_with_af),
        job.review?.initial_review_outcome || '-',
        job.review?.agency_feedback_action || '-',
        job.review?.final_review_outcome || '-'
      ]);
      
      // Calculate optimal column widths based on content and available space
      const columnWidths = [];
      const totalColumns = columns.length;
      
      // Define priority widths for different column types
      const priorityWidths = {
        'BU/Markets': 18,
        'Agency Invoice #': 20,
        'PO #': 15,
        'Period/Month': 15,
        'Invoice Sent Date': 18,
        'Feedback Date': 18,
        'Response Date': 18,
        'Approval Date': 18,
        'Medium': 15,
        'Campaign Name': 25,
        'Net Media Cost': 18,
        'Agency Fee': 15,
        'Taxes': 12,
        '3rd Party Cost': 18,
        'Invoice Total': 18,
        'Media Plan Total': 18,
        'PO Amount W/ AF': 18,
        'Initial Outcome': 18,
        'Agency Action': 22,
        'Final Outcome': 18
      };
      
      // Calculate total priority width
      let totalPriorityWidth = 0;
      columns.forEach(col => {
        totalPriorityWidth += priorityWidths[col] || 18;
      });
      
      // If priority widths fit, use them; otherwise, distribute evenly
      if (totalPriorityWidth <= availableWidth) {
        columns.forEach(col => {
          columnWidths.push(priorityWidths[col] || 18);
        });
      } else {
        // Distribute available width evenly among all columns
        const evenWidth = Math.floor(availableWidth / totalColumns);
        columns.forEach(() => {
          columnWidths.push(evenWidth);
        });
      }
      
      // Create the table with proper positioning
      doc.autoTable({
        head: [columns],
        body: tableData,
        startY: 65, // Start table below header
        styles: {
          fontSize: 6, // Small font to fit everything
          cellPadding: 1,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [220, 38, 38], // Red header matching the theme
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 6
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Light gray alternating rows
        },
        columnStyles: columnWidths.reduce((acc, width, index) => {
          acc[index] = { cellWidth: width };
          return acc;
        }, {}),
        margin: { top: 65, right: 10, bottom: 15, left: 10 },
        tableWidth: 'auto',
        didDrawPage: function (data) {
          // Ensure we stay on single page
          if (data.cursor.y > 180) {
            doc.setFontSize(5);
          }
        }
      });
      
      // Simple footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`MEDPUSH DMCC - Generated on ${new Date().toLocaleDateString()}`, 140, 195, { align: 'center' });
      
      // Save the PDF
      doc.save(`Detailed_Invoice_Review_${agency.agency_code}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Layout title={agency ? `${agency.name} | Detailed Invoice Review` : 'Detailed Invoice Review'}>
      <div className="mb-6">
        <button 
          onClick={() => router.push(`/agency/${id}`)}
          className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-secondary hover:bg-secondary/90 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <i className="fas fa-arrow-left mr-3 text-lg"></i>
          <span>Back to Agency</span>
        </button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center">
          <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">Loading detailed invoice review...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <i className="fas fa-exclamation-triangle text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">{error}</p>
          <button 
            onClick={() => router.push('/clients')}
            className="btn btn-secondary mt-4"
          >
            Go Back
          </button>
        </div>
      ) : agency ? (
        <>
          {/* Header Section */}
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-signika font-bold text-2xl text-primary mb-2">
                  Detailed Invoice Review
                </h1>
                <p className="font-signika font-light text-lg text-gray-700">
                  {agency.name} - {agency.agency_code}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-helvetica text-sm text-gray-500">Total Jobs</p>
                  <p className="font-signika font-bold text-2xl text-secondary">{jobs.length}</p>
                </div>
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF || jobs.length === 0}
                  className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isGeneratingPDF ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-3 text-lg"></i>
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download mr-3 text-lg"></i>
                      <span>Download PDF Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Invoice Review Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">BU/Markets</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Agency Invoice Number</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">PO #</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Period/Month</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Date Invoice Sent to MEDPUSH</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Date MEDPUSH shared feedback</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Date Agency responded to MEDPUSH feedback</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Date MEDPUSH approved invoice</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Medium</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Name of the Campaign</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Net Media Cost</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Agency Fee</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Taxes</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Other 3rd Party Fee/Cost</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Agency Invoice Total Amount</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Media Plan Total Amount</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">PO Amount W/ AF</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Initial Review Outcome</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Agency Feedback-Action</th>
                    <th className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom">Final Review Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {job.review?.market_bu || '-'}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {job.review?.agency_invoice_number || '-'}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {job.review?.po_number || '-'}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {job.review?.period_month || '-'}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatDate(job.review?.date_invoice_sent_to_medpush)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatDate(job.review?.date_medpush_shared_feedback)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatDate(job.review?.date_agency_responded_to_feedback)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatDate(job.review?.date_medpush_approved_invoice)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {job.review?.medium || '-'}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {job.review?.campaign_name || '-'}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatCurrency(job.review?.net_media_cost)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatCurrency(job.review?.agency_fee)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatCurrency(job.review?.taxes)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatCurrency(job.review?.other_third_party_cost)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatCurrency(job.review?.agency_invoice_total_amount)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatCurrency(job.review?.media_plan_total_amount)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        {formatCurrency(job.review?.po_amount_with_af)}
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        <div className="max-w-xs truncate" title={job.review?.initial_review_outcome}>
                          {job.review?.initial_review_outcome || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        <div className="max-w-xs truncate" title={job.review?.agency_feedback_action}>
                          {job.review?.agency_feedback_action || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-helvetica text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          job.review?.final_review_outcome === 'Approved' 
                            ? 'bg-green-100 text-green-800' 
                            : job.review?.final_review_outcome === 'Not Approved'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.review?.final_review_outcome || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan="20" className="py-8 text-center text-gray-500 font-helvetica">
                        No jobs found for this agency
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-8 text-center">
          <i className="fas fa-exclamation-triangle text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">Agency not found</p>
          <button 
            onClick={() => router.push('/clients')}
            className="btn btn-secondary mt-4"
          >
            Go Back
          </button>
        </div>
      )}
    </Layout>
  );
}
