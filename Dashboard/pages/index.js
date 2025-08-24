import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import MetricCard from '../components/MetricCard';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import BUMarketChart from '../components/charts/BUMarketChart';
import FinancialValueChart from '../components/charts/FinancialValueChart';
import ClientsTable from '../components/ClientsTable';
import ClientModal from '../components/ClientModal';

// Import dummy data for charts
import { 
  invoiceStatusData, 
  marketData, 
  spendPerMarketData,
  clientsData 
} from '../data/dummyData';

import { clientsAPI, agenciesAPI, dashboardAPI, jobsAPI } from '../utils/api';

export default function Home() {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    total_clients: 0,
    total_agencies: 0,
    total_invoices: 0,
    compliant_jobs: 0,
    non_compliant_jobs: 0
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch dashboard statistics
        const stats = await dashboardAPI.getStats();
        setDashboardStats(stats);
        
        // Fetch clients data
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

        // Fetch chart data from all agencies through clients
        try {
          let allChartData = [];
          
          // Get agencies for each client
          for (const client of clientsWithAgencyCounts) {
            try {
              const agencies = await agenciesAPI.getByClient(client.client_code);
              
              if (agencies && Array.isArray(agencies)) {
                for (const agency of agencies) {
                  try {
                    const jobs = await jobsAPI.getByAgency(agency.agency_code);
                    
                    if (jobs && Array.isArray(jobs)) {
                      const jobsWithReview = jobs.filter(job => job.review && job.review !== null);
                      
                      // Group by BU/Market
                      const buMarkets = ['A/E', 'APAC', 'DOMESTIC', 'COE', 'MEA'];
                      buMarkets.forEach(buMarket => {
                        const buJobs = jobsWithReview.filter(job => job.review?.market_bu === buMarket);
                        if (buJobs.length > 0) {
                          const existingMarket = allChartData.find(item => item["BU/Markets"] === buMarket);
                          if (existingMarket) {
                            existingMarket["Year-to-date"]["Number of Compliant JO Invoices"] += buJobs.filter(job => job.status === 'Compliant').length;
                            existingMarket["Year-to-date"]["Number of of Non-Compliant JO Invoices"] += buJobs.filter(job => job.status !== 'Compliant').length;
                            existingMarket["Year-to-date"]["Value of the Compliant JO Invoices (SAR)"] += buJobs.filter(job => job.status === 'Compliant').reduce((sum, job) => sum + (job.review?.agency_invoice_total_amount || 0), 0);
                            existingMarket["Year-to-date"]["Value of Non-Compliant JO Invoices (SAR)"] += buJobs.filter(job => job.status !== 'Compliant').reduce((sum, job) => sum + (job.review?.agency_invoice_total_amount || 0), 0);
                          } else {
                            allChartData.push({
                              "BU/Markets": buMarket,
                              "Year-to-date": {
                                "Number of Compliant JO Invoices": buJobs.filter(job => job.status === 'Compliant').length,
                                "Number of of Non-Compliant JO Invoices": buJobs.filter(job => job.status !== 'Compliant').length,
                                "Value of the Compliant JO Invoices (SAR)": buJobs.filter(job => job.status === 'Compliant').reduce((sum, job) => sum + (job.review?.agency_invoice_total_amount || 0), 0),
                                "Value of Non-Compliant JO Invoices (SAR)": buJobs.filter(job => job.status !== 'Compliant').reduce((sum, job) => sum + (job.review?.agency_invoice_total_amount || 0), 0),
                              }
                            });
                          }
                        }
                      });
                    }
                  } catch (error) {
                    console.error(`Error fetching jobs for agency ${agency.agency_code}:`, error);
                  }
                }
              }
            } catch (error) {
              console.error(`Error fetching agencies for client ${client.client_code}:`, error);
            }
          }
          
          setChartData(allChartData);
        } catch (error) {
          console.error('Error fetching chart data:', error);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
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
    <Layout title="Dashboard | Medpush X MEDPUSH">
      <div className="mb-6">
        <div>
          <h1 className="title">Dashboard</h1>
          <p className="subtitle">Welcome to Medpush X MEDPUSH Dashboard</p>
        </div>
      </div>



      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <MetricCard 
          title="Clients" 
          value={dashboardStats.total_clients || 0} 
          icon="fas fa-users" 
          iconColor="bg-secondary" 
        />
        <MetricCard 
          title="Agencies" 
          value={dashboardStats.total_agencies || 0} 
          icon="fas fa-building" 
          iconColor="bg-secondary" 
        />
        <MetricCard 
          title="Total Jobs" 
          value={dashboardStats.total_invoices || 0} 
          icon="fas fa-file-invoice" 
          iconColor="bg-secondary" 
        />
      </div>
      
      {/* Compliance Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <MetricCard 
          title="Compliant Jobs" 
          value={dashboardStats.compliant_jobs || 0} 
          icon="fas fa-check-circle" 
          iconColor="bg-green-500"
        />
        <MetricCard 
          title="Non-Compliant Jobs" 
          value={dashboardStats.non_compliant_jobs || 0} 
          icon="fas fa-exclamation-triangle" 
          iconColor="bg-red-500"
        />
      </div>

             {/* Charts Row */}
       <div className="grid grid-cols-1 gap-6 mb-6">
         <div className="h-80">
           <BarChart 
             title="Compliance Status Overview" 
             data={[
               { name: 'Compliant', value: dashboardStats.compliant_jobs || 0, fill: '#28a745' },
               { name: 'Non-Compliant', value: dashboardStats.non_compliant_jobs || 0, fill: '#C21A2C' },
             ]}
           />
         </div>
       </div>

      {/* New Real Data Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="h-80">
          <BUMarketChart data={chartData} />
        </div>
        <div className="h-80">
          <FinancialValueChart data={chartData} />
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
            <p className="font-signika font-light text-sm text-gray-500">© 2025 Medpush X MEDPUSH. All rights reserved.</p>
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