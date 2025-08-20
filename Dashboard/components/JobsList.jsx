import React from 'react';
import { useRouter } from 'next/router';

const JobsList = ({ jobs }) => {
  const router = useRouter();

  if (!jobs) {
    return null;
  }

  const handleViewJob = (jobId) => {
    router.push(`/job/${jobId}`);
  };

  const isJobCompliant = (job) => {
    if (!job) return false; // Re-adding the null check
    if (!job.checklist) return false;
    const requiredDocs = [
      'agency_invoice',
      'approved_quotation',
      'job_order',
      'timesheet',
      'third_party',
      'performance_proof',
    ];
    return requiredDocs.every((docType) => job.checklist[docType] && job.checklist[docType].length > 0);
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left font-helveticaBold">Campaign Name</th>
              <th className="py-3 px-4 text-left font-helveticaBold">Status</th>
              <th className="py-3 px-4 text-left font-helveticaBold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length > 0 ? (
              jobs.map((job) => {
                const compliant = isJobCompliant(job);
                return (
                  <tr key={job.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-helvetica font-medium">{job.title || 'No Title'}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          compliant
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {compliant ? 'Compliant' : 'Not Compliant'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleViewJob(job.id)}
                        className="bg-secondary hover:bg-secondary/90 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="3" className="py-8 text-center text-gray-500">
                  No jobs available for this agency yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobsList;
