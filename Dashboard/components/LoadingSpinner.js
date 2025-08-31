import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-primary text-4xl mb-4">
          <i className="fas fa-circle-notch fa-spin"></i>
        </div>
        <p className="text-gray-600 font-helvetica">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
