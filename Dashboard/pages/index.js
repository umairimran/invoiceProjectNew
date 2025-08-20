import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import MetricCard from '../components/MetricCard';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import ClientsTable from '../components/ClientsTable';
import ClientModal from '../components/ClientModal';

// Import dummy data
import { 
  metricCardData, 
  invoiceStatusData, 
  marketData, 
  spendPerMarketData,
  clientsData 
} from '../data/dummyData';

import { clientsAPI, agenciesAPI } from '../utils/api';

export default function Home() {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await clientsAPI.getAll();
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
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleCreateClient = async (clientData) => {
    try {
      const newClient = await clientsAPI.create({
        name: clientData.name
      });

      if (clientData.rateCardFile) {
        await clientsAPI.uploadRateCard(newClient.client_code, clientData.rateCardFile);
        newClient.rate_card_file = true;
      }

      setClients([...clients, { ...newClient, agencies_count: 0 }]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  return (
    <Layout title="Dashboard | Medpush DMCC">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="title">Dashboard</h1>
          <p className="subtitle">Welcome to Medpush DMCC Dashboard</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center">
            <i className="fas fa-download mr-2"></i>
            <span>Export</span>
          </button>
          <button className="btn btn-secondary flex items-center">
            <i className="fas fa-plus mr-2"></i>
            <span>New Report</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard 
          title="Clients" 
          value={metricCardData.clients} 
          icon="fas fa-users" 
          iconColor="bg-secondary" 
          trend={{ direction: 'up', value: 12 }}
        />
        <MetricCard 
          title="Agencies" 
          value={metricCardData.agencies} 
          icon="fas fa-building" 
          iconColor="bg-secondary" 
          trend={{ direction: 'up', value: 8 }}
        />
        <MetricCard 
          title="Invoices Received" 
          value={metricCardData.invoicesReceived} 
          icon="fas fa-file-invoice" 
          iconColor="bg-secondary" 
          trend={{ direction: 'up', value: 24 }}
        />
        <MetricCard 
          title="Ongoing Invoices" 
          value={metricCardData.ongoingInvoices} 
          icon="fas fa-hourglass-half" 
          iconColor="bg-secondary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="h-80">
          <BarChart 
            title="Approved vs Rejected Invoices" 
            data={[
              { name: 'Approved', value: 120, fill: '#28a745' },
              { name: 'Rejected', value: 30, fill: '#C21A2C' },
            ]}
          />
        </div>
        <div className="h-80">
          <PieChart 
            title="Market-wise Analysis" 
            data={[
              { name: 'KSA', value: 45, fill: '#C21A2C' },
              { name: 'UAE', value: 30, fill: '#2D3748' },
              { name: 'Egypt', value: 15, fill: '#718096' },
              { name: 'Qatar', value: 10, fill: '#A0AEC0' },
            ]}
          />
        </div>
        <div className="h-80">
          <BarChart 
            title="Spend per Market" 
            data={spendPerMarketData.map(item => ({
              name: item.name,
              value: item.value / 1000,
              fill: item.name === 'KSA' ? '#C21A2C' : 
                    item.name === 'UAE' ? '#2D3748' : 
                    item.name === 'Egypt' ? '#718096' : '#A0AEC0'
            }))} 
            customLabel="K$"
          />
        </div>
      </div>

      {/* Clients Table Row */}
      <div className="mb-6">
        {isLoading ? (
          <div className="card p-8 text-center">
            <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
            <p className="font-helvetica">Loading clients data...</p>
          </div>
        ) : (
          <ClientsTable data={clients} onCreateClient={() => setIsModalOpen(true)} sourcePage="dashboard" />
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

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-signika font-light text-sm text-gray-500">© 2025 Medpush DMCC. All rights reserved.</p>
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-500 hover:text-secondary">
              <i className="fas fa-question-circle"></i>
            </a>
            <a href="#" className="text-gray-500 hover:text-secondary">
              <i className="fas fa-cog"></i>
            </a>
            <a href="#" className="text-gray-500 hover:text-secondary">
              <i className="fas fa-user"></i>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}