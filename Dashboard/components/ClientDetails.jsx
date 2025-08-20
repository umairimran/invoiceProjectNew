import React from 'react';

const ClientDetails = ({ client }) => {
  if (!client) return null;

  return (
    <div className="card mb-6">
      <h2 className="font-signika font-bold text-xl mb-4">Client Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-gray-500 mb-1">Client Name</p>
          <p className="font-helveticaBold">{client.name}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500 mb-1">Client Code</p>
          <p className="font-helveticaBold">{client.client_code}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500 mb-1">Rate Card Status</p>
          {client.rate_card_file ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="h-2 w-2 mr-1 bg-green-400 rounded-full"></span>
              Uploaded
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <span className="h-2 w-2 mr-1 bg-gray-400 rounded-full"></span>
              Not Uploaded
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
