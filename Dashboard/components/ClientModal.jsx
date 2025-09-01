import React, { useState } from 'react';

const ClientModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    rateCardFile: null
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        rateCardFile: file
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Client name is required';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
        
        <h2 className="font-signika font-bold text-2xl mb-6 text-gray-800">Create New Client</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block font-helvetica text-sm font-medium text-gray-700 mb-2">
              Client Name <span className="text-secondary">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all duration-200 ${
                formErrors.name ? 'border-secondary' : 'border-gray-300 focus:border-secondary'
              }`}
              placeholder="Enter client name"
            />
            {formErrors.name && (
              <p className="text-secondary text-xs mt-1 font-helvetica">{formErrors.name}</p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block font-helvetica text-sm font-medium text-gray-700 mb-2">
              Rate Card Template
            </label>
            <div className="flex items-center">
              <label className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                <div className="flex flex-col items-center">
                  <i className="fas fa-cloud-upload-alt text-gray-400 text-xl mb-2"></i>
                  <span className="text-sm text-gray-500 font-helvetica">
                    {formData.rateCardFile ? formData.rateCardFile.name : 'Upload rate card (optional)'}
                  </span>
                </div>
                <input
                  type="file"
                  name="rateCardFile"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 font-helvetica font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300/20"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 font-helvetica font-medium text-white bg-secondary hover:bg-secondary/90 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                'Create Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;