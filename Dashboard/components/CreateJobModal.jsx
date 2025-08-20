import React, { useState } from 'react';

const CreateJobModal = ({ isOpen, onClose, onSubmit, agencyId }) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Campaign title is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const jobDataToSend = {
      title: title,
      agency_id: agencyId,
      created_by: localStorage.getItem('user_id'), // Assuming user_id is stored in localStorage after login
      formData: {
        title: title,
      },
    };
    
    const success = await onSubmit(jobDataToSend);
    if (success) {
      setTitle('');
      onClose();
    } else {
      setError('Failed to create job. Please try again.');
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <i className="fas fa-times"></i>
        </button>
        
        <h2 className="font-signika font-bold text-2xl mb-6">Create New Job</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block font-helvetica text-sm font-medium text-gray-700 mb-2">
              Campaign Title <span className="text-secondary">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter the title of the job"
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-secondary hover:bg-secondary/90 text-white rounded-lg font-medium transition-colors duration-200 flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting && <i className="fas fa-spinner fa-spin mr-2"></i>}
              {isSubmitting ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobModal;
