import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const ClientsTable = ({ data, onCreateClient, sourcePage }) => {
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const getClassNamesFor = (name) => {
    if (!sortConfig) {
      return;
    }
    return sortConfig.key === name ? sortConfig.direction : undefined;
  };

  // Filter data based on search term
  const filteredData = getSortedData().filter(client => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchTermLower) ||
      client.client_code.toLowerCase().includes(searchTermLower)
    );
  });

  // Navigate to client details page
  const handleViewClient = (clientCode) => {
    router.push(`/client/${clientCode}`);
  };

  return (
    <div className="card overflow-hidden border-t-4 border-primary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-signika font-bold text-xl">Clients List</h3>
        <div className="flex items-center">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          </div>
          <button 
            className="ml-4 bg-secondary hover:bg-secondary/90 text-white rounded-lg px-4 py-2 flex items-center"
            onClick={onCreateClient}
          >
            <i className="fas fa-plus mr-2"></i>
            <span className="font-helvetica">Add Client</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center">
                  <span>Client Name</span>
                  <i className={`ml-1 fas ${getClassNamesFor('name') === 'ascending' ? 'fa-sort-up' : getClassNamesFor('name') === 'descending' ? 'fa-sort-down' : 'fa-sort'}`}></i>
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
                onClick={() => requestSort('client_code')}
              >
                <div className="flex items-center">
                  <span>Client Code</span>
                  <i className={`ml-1 fas ${getClassNamesFor('client_code') === 'ascending' ? 'fa-sort-up' : getClassNamesFor('client_code') === 'descending' ? 'fa-sort-down' : 'fa-sort'}`}></i>
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
              >
                <div className="flex items-center">
                  <span>Agencies</span>
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
              >
                <div className="flex items-center">
                  <span>Rate Card</span>
                </div>
              </th>
              <th 
                className="py-3 px-4 text-left font-helveticaBold"
                onClick={() => requestSort('created_at')}
              >
                <div className="flex items-center">
                  <span>Created Date</span>
                  <i className={`ml-1 fas ${getClassNamesFor('created_at') === 'ascending' ? 'fa-sort-up' : getClassNamesFor('created_at') === 'descending' ? 'fa-sort-down' : 'fa-sort'}`}></i>
                </div>
              </th>
              <th className="py-3 px-4 text-left font-helveticaBold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((client) => (
              <tr 
                key={client.id} 
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center mr-3">
                      {client.name.charAt(0)}
                    </div>
                    <span className="font-helvetica">{client.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 font-helvetica">{client.client_code}</td>
                <td className="py-4 px-4 font-helvetica">{client.agencies_count || 0}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-helvetica ${
                      client.rate_card_file ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <span className={`h-2 w-2 rounded-full mr-1 ${
                        client.rate_card_file ? 'bg-green-500' : 'bg-gray-500'
                      }`}></span>
                      {client.rate_card_file ? 'Uploaded' : 'Not Uploaded'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 font-helvetica">
                  {new Date(client.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-4">
                  <div className="flex space-x-2">
                    <Link href={`/client/${client.client_code}${sourcePage ? `?from=${sourcePage}` : ''}`} passHref>
                      <button 
                        className="btn btn-sm btn-secondary py-1 px-3"
                        title="View Client Details"
                      >
                        View Client Details
                      </button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">
                  {searchTerm ? 'No clients found matching your search' : 'No clients available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="font-helvetica text-sm text-gray-500">
          Showing {filteredData.length} of {data.length} clients
        </div>
      </div>
    </div>
  );
};

export default ClientsTable;