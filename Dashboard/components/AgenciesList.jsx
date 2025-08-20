import React, { useState } from 'react';
import { useRouter } from 'next/router';
import AgencyModal from './AgencyModal';

const AgenciesList = ({ agencies, onCreateAgency, clientId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-signika font-bold text-xl">Agencies</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-secondary hover:bg-secondary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center shadow-sm hover:shadow-md"
        >
          <i className="fas fa-plus mr-2"></i>
          Create Agency
        </button>
      </div>
      
      {agencies.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-building text-gray-400 text-3xl"></i>
          </div>
          <h3 className="font-helveticaBold text-xl text-gray-700 mb-2">No Agencies Yet</h3>
          <p className="font-helvetica text-gray-500 mb-6">Create your first agency to get started with this client.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-secondary hover:bg-secondary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            <i className="fas fa-plus mr-2"></i>
            Create First Agency
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {agencies.map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      )}
      
      {/* Create Agency Modal */}
      {isModalOpen && (
        <AgencyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={onCreateAgency}
          clientId={clientId}
        />
      )}
    </div>
  );
};

const AgencyCard = ({ agency }) => {
  const router = useRouter();

  const handleViewAgency = () => {
    router.push(`/agency/${agency.agency_code}`);
  };

  return (
    <div className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <i className="fas fa-building text-white text-xl"></i>
        </div>
        
        <h3 className="font-helveticaBold text-lg text-gray-800 mb-3 line-clamp-2">
          {agency.name}
        </h3>
        
        <div className="bg-gray-100 rounded-lg px-3 py-2 mb-4">
          <span className="text-sm font-mono text-gray-700 font-medium">
            {agency.agency_code}
          </span>
        </div>
        
        <button 
          onClick={handleViewAgency}
          className="w-full bg-secondary hover:bg-secondary/90 text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center group"
        >
          <span>View Details</span>
          <i className="fas fa-arrow-right ml-2 text-sm group-hover:translate-x-1 transition-transform duration-200"></i>
        </button>
      </div>
    </div>
  );
};

export default AgenciesList;
