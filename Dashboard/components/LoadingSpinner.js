import React from 'react';

const LoadingSpinner = ({ message = 'Loading...', showProgress = false }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Main spinner */}
        <div className="relative mb-6">
          <div className="text-primary text-6xl mb-4">
            <i className="fas fa-circle-notch fa-spin"></i>
          </div>
          {/* Pulse effect */}
          <div className="absolute inset-0 text-primary text-6xl opacity-20">
            <i className="fas fa-circle-notch fa-spin" style={{ animationDelay: '0.5s' }}></i>
          </div>
        </div>
        
        {/* Message */}
        <p className="text-gray-700 font-helvetica text-lg mb-4">{message}</p>
        
        {/* Progress bar for navigation loading */}
        {showProgress && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-secondary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        )}
        
        {/* Loading dots animation */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
