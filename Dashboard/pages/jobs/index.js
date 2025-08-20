import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { jobsAPI } from '../../utils/api';

export default function JobsListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // In a real implementation, we would fetch all jobs across agencies
        // For now, we'll use a mock approach
        const response = await fetch('/api/jobs');
        
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        
        const jobsData = await response.json();
        setJobs(Array.isArray(jobsData) ? jobsData : []);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError(`Failed to load jobs: ${err.message}`);
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJobs();
  }, []);

  // Filter jobs by status
  const filteredJobs = statusFilter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === statusFilter);

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Layout title="Jobs">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="title">Jobs</h1>
          <p className="subtitle">Manage all jobs across agencies</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mr-4 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-secondary text-2xl mb-2"></i>
            <p className="font-helvetica">Loading jobs...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <i className="fas fa-exclamation-triangle text-secondary text-2xl mb-2"></i>
            <p className="font-helvetica">{error}</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-helveticaBold">Title</th>
                  <th className="py-3 px-4 text-left font-helveticaBold">Agency</th>
                  <th className="py-3 px-4 text-left font-helveticaBold">Start Date</th>
                  <th className="py-3 px-4 text-left font-helveticaBold">End Date</th>
                  <th className="py-3 px-4 text-left font-helveticaBold">Status</th>
                  <th className="py-3 px-4 text-right font-helveticaBold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-helvetica font-medium">{job.title || 'No Title'}</div>
                      {job.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{job.description}</div>
                      )}
                    </td>
                    <td className="py-4 px-4 font-helvetica">
                      {job.agency_id}
                    </td>
                    <td className="py-4 px-4 font-helvetica">
                      {formatDate(job.start_date)}
                    </td>
                    <td className="py-4 px-4 font-helvetica">
                      {formatDate(job.end_date)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(job.status)}`}
                      >
                        {job.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => router.push(`/job/${job.id}`)}
                        className="bg-secondary hover:bg-secondary/90 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-folder-open text-gray-400 text-3xl mb-2"></i>
            <p className="font-helvetica text-gray-500">No jobs found</p>
            {statusFilter !== 'all' && (
              <p className="text-sm text-gray-400 mt-1">
                Try changing your filter to see more results
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
