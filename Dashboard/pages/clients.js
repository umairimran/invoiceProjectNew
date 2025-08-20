import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ClientMetrics from '../components/ClientMetrics';
import RateCardChart from '../components/RateCardChart';
import ClientsTable from '../components/ClientsTable';
import ClientModal from '../components/ClientModal';
import { clientsAPI, agenciesAPI } from '../utils/api';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Client metrics
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    withRateCard: 0
  });

  // Fetch clients data
  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Fetch clients from the API
        const data = await clientsAPI.getAll();
        
        // For each client, get the count of agencies
        const clientsWithAgencyCounts = await Promise.all(
          data.map(async (client) => {
            try {
              const agencyCount = await agenciesAPI.countByClient(client.client_code);
              return {
                ...client,
                agencies_count: agencyCount
              };
            } catch (error) {
              console.error(`Error fetching agency count for client ${client.client_code}:`, error);
              return {
                ...client,
                agencies_count: 0
              };
            }
          })
        );
        
        setClients(clientsWithAgencyCounts);
        
        // Calculate metrics
        const withRateCard = data.filter(client => client.rate_card_file).length;
        
        setMetrics({
          totalClients: data.length,
          withRateCard
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Handle creating a new client
  const handleCreateClient = async (clientData) => {
    try {
      // Create client
      const newClient = await clientsAPI.create({
        name: clientData.name
      });
      
      // If there's a rate card file, upload it
      if (clientData.rateCardFile) {
        await clientsAPI.uploadRateCard(newClient.client_code, clientData.rateCardFile);
        
        // Update the client with rate card file info
        newClient.rate_card_file = true;
      }
      
      // Add the new client to the list
      setClients([...clients, { ...newClient, agencies_count: 0 }]);
      
      // Update metrics
      setMetrics({
        totalClients: metrics.totalClients + 1,
        withRateCard: clientData.rateCardFile ? metrics.withRateCard + 1 : metrics.withRateCard
      });
      
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  return (
    <Layout title="Clients | Medpush DMCC">
      <div className="mb-6">
        <h1 className="title">Clients</h1>
        <p className="subtitle">Manage your clients and their information</p>
      </div>

      {/* Client Metrics */}
      <ClientMetrics metrics={metrics} />

      {/* Rate Card Chart */}
      <div className="mb-6">
        <RateCardChart 
          withRateCard={metrics.withRateCard} 
          withoutRateCard={metrics.totalClients - metrics.withRateCard} 
        />
      </div>

      {/* Clients Table */}
      <div className="mb-6">
        {isLoading ? (
          <div className="card p-8 text-center">
            <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
            <p className="font-helvetica">Loading clients data...</p>
          </div>
        ) : (
          <ClientsTable 
            data={clients} 
            onCreateClient={() => setIsModalOpen(true)}
            sourcePage="clients"
          />
        )}
      </div>
      
      {/* Create Client Modal */}
      {isModalOpen && (
        <ClientModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleCreateClient}
        />
      )}
    </Layout>
  );
}