import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import SummaryPage from '../../../components/SummaryPage';
import { jobsAPI } from '../../../utils/api';

export default function AgencySummaryPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [summaryData, setSummaryData] = useState({
    rows: [],
    noteTotals: null,
    lastTwoWeeksLabel: "Last two weeks (13/08/2025- 20/08/2025)"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    
        const fetchSummaryData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all jobs for this agency
        const allJobs = await jobsAPI.getByAgency(id);
        
        if (!allJobs || !Array.isArray(allJobs)) {
          throw new Error('Failed to fetch jobs data');
        }

        // Use all jobs for summary, but only jobs with review object for calculations
        const jobs = allJobs;
        const jobsWithReview = allJobs.filter(job => job.review && job.review !== null);

        // Calculate date ranges
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Initialize data structure
        const buMarkets = ['A/E', 'APAC', 'DOMESTIC', 'COE', 'MEA'];
        const summaryRows = [];
        let ytdTotalCompliant = 0;
        let ytdTotalNonCompliant = 0;
        let ytdTotalCompliantValue = 0;
        let ytdTotalNonCompliantValue = 0;
        let l2wTotalCompliant = 0;
        let l2wTotalNonCompliant = 0;
        let l2wTotalCompliantValue = 0;
        let l2wTotalNonCompliantValue = 0;

        // Process each BU/Market
        buMarkets.forEach(buMarket => {
          const buJobs = jobsWithReview.filter(job => job.review?.market_bu === buMarket);
          

          
          // Year-to-date calculations
          const ytdJobs = buJobs.filter(job => {
            const jobDate = new Date(job.created_at);
            const isInYear = jobDate >= startOfYear;

            return isInYear;
          });

          const ytdCompliantJobs = ytdJobs.filter(job => job.status === 'Compliant');
          const ytdNonCompliantJobs = ytdJobs.filter(job => job.status === 'Not Compliant');
          

          
          const ytdCompliantCount = ytdCompliantJobs.length;
          const ytdNonCompliantCount = ytdNonCompliantJobs.length;
          const ytdCompliantValue = ytdCompliantJobs.reduce((sum, job) => 
            sum + (job.review?.agency_invoice_total_amount || 0), 0);
          const ytdNonCompliantValue = ytdNonCompliantJobs.reduce((sum, job) => 
            sum + (job.review?.agency_invoice_total_amount || 0), 0);

          // Last two weeks calculations
          const l2wJobs = buJobs.filter(job => {
            const jobDate = new Date(job.created_at);
            const isInLastTwoWeeks = jobDate >= twoWeeksAgo;

            return isInLastTwoWeeks;
          });

          const l2wCompliantJobs = l2wJobs.filter(job => job.status === 'Compliant');
          const l2wNonCompliantJobs = l2wJobs.filter(job => job.status === 'Not Compliant');
          

          
          const l2wCompliantCount = l2wCompliantJobs.length;
          const l2wNonCompliantCount = l2wNonCompliantJobs.length;
          const l2wCompliantValue = l2wCompliantJobs.reduce((sum, job) => 
            sum + (job.review?.agency_invoice_total_amount || 0), 0);
          const l2wNonCompliantValue = l2wNonCompliantJobs.reduce((sum, job) => 
            sum + (job.review?.agency_invoice_total_amount || 0), 0);

          // Add to totals
          ytdTotalCompliant += ytdCompliantCount;
          ytdTotalNonCompliant += ytdNonCompliantCount;
          ytdTotalCompliantValue += ytdCompliantValue;
          ytdTotalNonCompliantValue += ytdNonCompliantValue;
          l2wTotalCompliant += l2wCompliantCount;
          l2wTotalNonCompliant += l2wNonCompliantCount;
          l2wTotalCompliantValue += l2wCompliantValue;
          l2wTotalNonCompliantValue += l2wNonCompliantValue;

          // Add row if there are any jobs

          
          if (ytdCompliantCount > 0 || ytdNonCompliantCount > 0 || 
              l2wCompliantCount > 0 || l2wNonCompliantCount > 0) {

            
            summaryRows.push({
              "BU/Markets": buMarket,
              "Year-to-date": {
                "Number of Compliant JO Invoices": ytdCompliantCount,
                "Number of of Non-Compliant JO Invoices": ytdNonCompliantCount,
                "Value of the Compliant JO Invoices (SAR)": ytdCompliantValue,
                "Value of Non-Compliant JO Invoices  (SAR)": ytdNonCompliantValue,
              },
              lastTwoWeeks: {
                "Number of Compliant JO Invoices": l2wCompliantCount,
                "Number of of Non-Compliant JO Invoices": l2wNonCompliantCount,
                "Value of the Compliant JO Invoices (SAR)": l2wCompliantValue,
                "Value of Non-Compliant JO Invoices  (SAR)": l2wNonCompliantValue,
              },
                        });
          }
        });

        // Add TOTAL row
        if (ytdTotalCompliant > 0 || ytdTotalNonCompliant > 0 || 
            l2wTotalCompliant > 0 || l2wTotalNonCompliant > 0) {
          summaryRows.push({
            "BU/Markets": "TOTAL",
            "Year-to-date": {
              "Number of Compliant JO Invoices": ytdTotalCompliant,
              "Number of of Non-Compliant JO Invoices": ytdTotalNonCompliant,
              "Value of the Compliant JO Invoices (SAR)": ytdTotalCompliantValue,
              "Value of Non-Compliant JO Invoices  (SAR)": ytdTotalNonCompliantValue,
            },
            lastTwoWeeks: {
              "Number of Compliant JO Invoices": l2wTotalCompliant,
              "Number of of Non-Compliant JO Invoices": l2wTotalNonCompliant,
              "Value of the Compliant JO Invoices (SAR)": l2wTotalCompliantValue,
              "Value of Non-Compliant JO Invoices  (SAR)": l2wTotalNonCompliantValue,
            },
          });
        }

        // Only show rows if there's actual data - don't show empty default rows

        const summaryData = {
          rows: summaryRows,
          noteTotals: {
            "Year-to-date": { 
              "Total # of JOs": ytdTotalCompliant + ytdTotalNonCompliant, 
              "Total amount (SAR)": ytdTotalCompliantValue + ytdTotalNonCompliantValue 
            },
            lastTwoWeeks: { 
              "Total # of JOs": l2wTotalCompliant + l2wTotalNonCompliant, 
              "Total amount (SAR)": l2wTotalCompliantValue + l2wTotalNonCompliantValue 
            },
          },

        };
        
        setSummaryData(summaryData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching summary data:', err);
        setError('Failed to load summary data. Please try again.');
        setIsLoading(false);
      }
    };

    fetchSummaryData();
  }, [id]);

  const handleClose = () => {
    router.push(`/agency/${id}`);
  };

  return (
    <Layout>
      {isLoading ? (
        <div className="card p-8 text-center">
          <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">Loading summary data...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <i className="fas fa-exclamation-triangle text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">{error}</p>
          <button 
            onClick={handleClose}
            className="btn btn-secondary mt-4"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div>
                                {/* Header with back button */}
                      <div className="mb-6">
                        <button 
                          onClick={handleClose}
                          className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-secondary hover:bg-secondary/90 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <i className="fas fa-arrow-left mr-3 text-lg"></i>
                          <span>Back</span>
                        </button>
                      </div>

                      <div className="mb-6">
                        <h1 className="font-signika font-bold text-2xl text-gray-800">
                          INVOICES VALIDATION SUMMARY - {id}
                        </h1>
                      </div>



          {/* Summary Content */}
          <SummaryPage
            title=""
            rows={summaryData.rows}
            lastTwoWeeksLabel={summaryData.lastTwoWeeksLabel}
            noteTotals={summaryData.noteTotals}
            onClose={handleClose}
          />
        </div>
      )}
    </Layout>
  );
}
