import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { clientsAPI } from '../../utils/api';
import ClientDetails from '../../components/ClientDetails';
import RateCardManager from '../../components/RateCardManager';
import AgenciesList from '../../components/AgenciesList';

export default function ClientDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [client, setClient] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch client details
  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const clientData = await clientsAPI.getByCode(id);
        setClient(clientData);
        
        // Fetch agencies for this client
        const agenciesData = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/agencies?client_id=${id}`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'InvoiceApp/1.0',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          }
        }).then(res => res.json());
        
        setAgencies(agenciesData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching client details:', err);
        setError('Failed to load client details. Please try again.');
        setIsLoading(false);
      }
    };

    fetchClientDetails();
  }, [id]);

  // Handle rate card upload
  const handleRateCardUpload = async (file) => {
    try {
      await clientsAPI.uploadRateCard(id, file);
      // Refresh client data to show updated rate card status
      const updatedClient = await clientsAPI.getByCode(id);
      setClient(updatedClient);
      return true;
    } catch (error) {
      console.error('Error uploading rate card:', error);
      return false;
    }
  };

  // Handle agency creation
  const handleCreateAgency = async (agencyData) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/agencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          name: agencyData.name,
          client_id: id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create agency');
      }
      
      const newAgency = await response.json();
      
      // Update agencies list
      setAgencies([...agencies, newAgency]);
      return true;
    } catch (error) {
      console.error('Error creating agency:', error);
      return false;
    }
  };

  return (
    <Layout title={client ? `${client.name} | Client Details` : 'Client Details'}>
      <div className="mb-6">
        <button 
          onClick={() => router.push('/clients')}
          className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-secondary hover:bg-secondary/90 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <i className="fas fa-arrow-left mr-3 text-lg"></i>
          <span>Back to Clients</span>
        </button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center">
          <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">Loading client details...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <i className="fas fa-exclamation-triangle text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">{error}</p>
          <button 
            onClick={() => router.push('/clients')}
            className="btn btn-secondary mt-4"
          >
            Return to Clients
          </button>
        </div>
      ) : client ? (
        <>
          {/* Client Details Card */}
          <ClientDetails client={client} />
          
          {/* Rate Card Management Section */}
          <div className="mb-6">
            <RateCardManager 
              client={client} 
              onUploadRateCard={handleRateCardUpload} 
            />
          </div>
          
          {/* Agencies Section */}
          <div>
            <AgenciesList 
              agencies={agencies} 
              onCreateAgency={handleCreateAgency}
              clientId={id}
            />
          </div>
        </>
      ) : (
        <div className="card p-8 text-center">
          <i className="fas fa-exclamation-triangle text-secondary text-2xl mb-2"></i>
          <p className="font-helvetica">Client not found</p>
          <button 
            onClick={() => router.push('/clients')}
            className="btn btn-secondary mt-4"
          >
            Return to Clients
          </button>
        </div>
      )}
    </Layout>
  );
}
