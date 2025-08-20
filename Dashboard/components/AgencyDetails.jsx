import React from 'react';
import { formatDate } from '../utils/helpers';

const AgencyDetails = ({ agency }) => {
  if (!agency) return null;

  return (
    <div className="card mb-6">
      <h2 className="font-signika font-bold text-xl mb-6">Agency Information</h2>
      
      <div className="flex items-start">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md mr-6">
          <i className="fas fa-building text-white text-2xl"></i>
        </div>
        
        <div className="flex-1">
          <h1 className="font-helveticaBold text-2xl text-gray-800 mb-2">
            {agency.name}
          </h1>
          <div className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm font-mono text-gray-700 mb-4">
            {agency.agency_code}
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Client Info */}
        <div>
          <h3 className="font-helveticaBold text-lg mb-3">Client</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Client ID</p>
              <p className="font-medium">{agency.client_id}</p>
            </div>
          </div>
        </div>
        
        {/* Rate Card Info */}
        <div>
          <h3 className="font-helveticaBold text-lg mb-3">Rate Card</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              {agency.rate_card_file ? (
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="h-2 w-2 mr-1 bg-green-400 rounded-full"></span>
                    Uploaded
                  </span>
                  {agency.rate_card_file && (
                    <button className="ml-3 text-blue-600 hover:text-blue-800 text-sm">
                      <i className="fas fa-download mr-1"></i>
                      Download
                    </button>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <span className="h-2 w-2 mr-1 bg-gray-400 rounded-full"></span>
                  Not Uploaded
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Creation Info */}
        <div>
          <h3 className="font-helveticaBold text-lg mb-3">Creation Info</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Created By</p>
              <p className="font-medium">{agency.created_by}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium">{formatDate(agency.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Folders Section - if available */}
      {agency.custom_folders && agency.custom_folders.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="font-helveticaBold text-lg mb-3">Custom Folders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {agency.custom_folders.map((folder, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center">
                  <i className="fas fa-folder text-yellow-500 mr-2"></i>
                  <span>{folder.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDetails;
