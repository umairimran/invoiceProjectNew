import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { agenciesAPI, jobsAPI, clientsAPI } from '../../utils/api';
import AgencyDetails from '../../components/AgencyDetails';
import JobsList from '../../components/JobsList';
import CreateJobModal from '../../components/CreateJobModal';
import AgencyRateCardManager from '../../components/AgencyRateCardManager';

export default function AgencyDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [agency, setAgency] = useState(null);
  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAgencyData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch agency details
        console.log(`Fetching agency details for ID: ${id}`);
        const agencyData = await agenciesAPI.getByCode(id);
        setAgency(agencyData);
        
        // Only fetch jobs if we successfully got the agency
        if (agencyData) {
          // Fetch jobs for this agency
          console.log(`Fetching jobs for agency: ${id}`);
          const jobsData = await jobsAPI.getByAgency(id);
          setJobs(Array.isArray(jobsData) ? jobsData : []);
          
          // Fetch client details for this agency
          console.log(`Fetching client details for client: ${agencyData.client_id}`);
          const clientData = await clientsAPI.getByCode(agencyData.client_id);
          setClient(clientData);
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

  // Handle job creation
  const handleCreateJob = async (jobData) => {
    try {
      const newJob = await jobsAPI.create(agency.agency_code, jobData);
      // Re-fetch all jobs to ensure consistency
      await fetchAgencyData(); 
      setIsModalOpen(false);
      return true;
    } catch (error) {
      console.error('Error creating job:', error);
      return false;
    }
  };

  // Handle rate card upload
  const handleRateCardUpload = async (file) => {
    try {
      await agenciesAPI.uploadRateCard(id, file);
      // Refresh agency data to show updated rate card status
      const updatedAgency = await agenciesAPI.getByCode(id);
      setAgency(updatedAgency);
      return true;
    } catch (error) {
      console.error('Error uploading rate card:', error);
      return false;
    }
  };

  return (
    <Layout title={agency ? `${agency.name} | Agency Details` : 'Agency Details'}>
      <div className="mb-6">
        <button 
          onClick={() => router.push('/clients')}
          className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-secondary hover:bg-secondary/90 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <i className="fas fa-arrow-left mr-3 text-lg"></i>
          <span>Back</span>
        </button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center">
          <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">Loading agency details...</p>
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
          {/* Agency Details Section */}
          <AgencyDetails agency={agency} client={client} />
          
          {/* Rate Card Management Section */}
          <div className="mt-8 mb-6">
            <AgencyRateCardManager 
              agency={agency} 
              onUploadRateCard={handleRateCardUpload} 
            />
          </div>
          
          {/* Jobs/Invoices Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-signika font-bold text-xl">Jobs & Invoices</h2>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-secondary hover:bg-secondary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center shadow-sm hover:shadow-md"
              >
                <i className="fas fa-plus mr-2"></i>
                Create Job
              </button>
            </div>
            
            <JobsList 
              jobs={jobs} 
              agencyId={id} 
            />
          </div>
          
          {/* Create Job Modal */}
          {isModalOpen && (
            <CreateJobModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleCreateJob}
              agencyId={id}
            />
          )}
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
