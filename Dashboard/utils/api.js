// API client for making requests to the backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Mock data for development when API is not available
const MOCK_DATA = {
  jobs: {
    "68a46aeb1fadd5e61fe562c9": {
      "agency_id": "AGY-F99240",
      "title": "Riyadh Book Fair 2023 & Aseer Season 202",
      "description": "Campaign covering Riyadh Book Fair 2023 & Aseer Season 2023",
      "start_date": "2023-11-01T00:00:00Z",
      "end_date": "2023-11-30T23:59:59Z",
      "status": "completed",
      "review": {
        "market_bu": "MEA",
        "agency_invoice_number": "PDC24|10002",
        "po_number": "JO 78",
        "period_month": "Nov-23",
        "date_invoice_sent_to_medpush": "2024-03-13T00:00:00Z",
        "date_medpush_shared_feedback": "2024-03-14T00:00:00Z",
        "date_agency_responded_to_feedback": "2024-05-30T00:00:00Z",
        "date_medpush_approved_invoice": "2024-06-02T00:00:00Z",
        "medium": "Digital",
        "campaign_name": "Riyadh Book Fair 2023 & Aseer Season 2023",
        "net_media_cost": 5491303,
        "agency_fee": 160871,
        "taxes": 847826,
        "other_third_party_cost": 0,
        "agency_invoice_total_amount": 6500000,
        "media_plan_total_amount": 6500000,
        "po_amount_with_af": 6500000,
        "initial_review_outcome": "1. Kindly provide a Purchase Order (PO).\n2. Attach the full activity reports.\n3. Provide supplier invoices.\n\n- The total invoiced amount is SAR 6,500,000 However, the actual spend is only SAR 659,210  To account for the difference of SAR 5,840,788.84 PHD has issued a credit note with the number PDC24|10056",
        "agency_feedback_action": "1. Attached\n2. Attached\n3. Attached",
        "final_review_outcome": "Approved",
        "status_of_received_invoices": "Invoice was not received originally compliant",
        "month_medpush_received_invoice": "Mar",
        "days_medpush_to_review_and_share_feedback": 1,
        "days_agency_to_revert_to_medpush": 77,
        "days_medpush_to_approve_after_revision": 3
      },
      "checklist": {
        "agency_invoice": [],
        "approved_quotation": [],
        "job_order": [],
        "timesheet": [],
        "third_party": [],
        "performance_proof": []
      },
      "id": "68a46aeb1fadd5e61fe562c9",
      "created_by": "system_admin",
      "created_at": "2025-08-19T08:39:32.117000Z",
      "updated_at": "2025-08-19T15:21:40.412000"
    }
  },
  agencies: [],
  clients: []
};

// Flag to use mock data in development when API is not available
const USE_MOCK = process.env.NODE_ENV === 'development';

/**
 * Make a request to the API
 * @param {string} endpoint - The API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<any>} - The response data
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Could not access localStorage for auth token');
  }

  // Prepare request config
  const config = {
    ...options,
    headers,
  };

  try {
    // Make the API request
    console.log(`API Request: ${url}`);
    
    try {
      const response = await fetch(url, config);
      
      // Handle error responses
      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText} for ${url}`);
        
        // Try to get more details from the response
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        
        // Don't throw immediately on 404s, let the caller handle them
        if (response.status === 404) {
          console.warn(`Resource not found: ${endpoint}`);
          return null; // Return null for 404 errors instead of throwing
        }
        
        // Try to get error details from response body
        let errorBody = '';
        try {
          errorBody = await response.text();
          if (errorBody) {
            try {
              // Try to parse as JSON
              const errorJson = JSON.parse(errorBody);
              if (errorJson.detail) {
                errorMessage = errorJson.detail;
              } else {
                errorMessage = JSON.stringify(errorJson);
              }
            } catch {
              // Not JSON, use as plain text if it's not too long
              if (errorBody.length < 100) {
                errorMessage = errorBody;
              }
            }
          }
        } catch (e) {
          console.error('Could not read error response body', e);
        }
        
        throw new Error(errorMessage);
      }
      
      // Handle successful responses
      if (response.headers.get('content-length') === '0' || response.status === 204) {
        return {};
      }
      
      // Parse JSON response
      try {
        const data = await response.json();
        return data;
      } catch (e) {
        console.error('Error parsing JSON response', e);
        throw new Error('Invalid JSON response from server');
      }
    } catch (fetchError) {
      // If we couldn't make the fetch request at all (e.g., network error)
      if (USE_MOCK) {
        console.warn(`Using mock data for ${endpoint} because the API is not available`);
        
        // Extract resource type and ID from endpoint
        const isJobById = endpoint.match(/\/jobs\/([a-zA-Z0-9]+)$/);
        const isJobsList = endpoint.match(/\/jobs(\?|$)/);
        
        if (isJobById) {
          const jobId = isJobById[1];
          if (MOCK_DATA.jobs[jobId]) {
            return MOCK_DATA.jobs[jobId];
          }
        } else if (isJobsList) {
          return Object.values(MOCK_DATA.jobs);
        }
        
        // Add more mock data handlers as needed
        
        console.warn(`No mock data available for ${endpoint}`);
        return null;
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error(`API Request Failed: ${url}`, error);
    throw error;
  }
}

// Client-related API functions
export const clientsAPI = {
  /**
   * Get all clients
   * @returns {Promise<Array>} - List of clients
   */
  getAll: async () => {
    return fetchAPI('/clients');
  },
  
  /**
   * Get a client by client_code
   * @param {string} clientCode - Client code
   * @returns {Promise<Object>} - Client data
   */
  getByCode: async (clientCode) => {
    return fetchAPI(`/clients/${clientCode}`);
  },
  
  /**
   * Create a new client
   * @param {Object} clientData - Client data (name)
   * @returns {Promise<Object>} - Created client
   */
  create: async (clientData) => {
    return fetchAPI('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  },
  
  /**
   * Upload a rate card for a client
   * @param {string} clientCode - Client code
   * @param {File} file - Rate card file
   * @returns {Promise<Object>} - Upload response
   */
  uploadRateCard: async (clientCode, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload/rate_card/${clientCode}`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, let the browser set it with the boundary
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to upload rate card';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use the text as error message
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(`Upload failed: ${errorMessage} (Status: ${response.status})`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Rate card upload error:', error);
      throw error;
    }
  },
};

// Agency-related API functions
export const agenciesAPI = {
  /**
   * Get all agencies for a client
   * @param {string} clientCode - Client code
   * @returns {Promise<Array>} - List of agencies
   */
  getByClient: async (clientCode) => {
    return fetchAPI(`/agencies?client_id=${clientCode}`);
  },
  
  /**
   * Count agencies by client
   * @param {string} clientCode - Client code
   * @returns {Promise<number>} - Number of agencies
   */
  countByClient: async (clientCode) => {
    const agencies = await fetchAPI(`/agencies?client_id=${clientCode}`);
    return agencies.length;
  },
  
  /**
   * Create a new agency
   * @param {Object} agencyData - Agency data (name, client_id)
   * @returns {Promise<Object>} - Created agency
   */
  create: async (agencyData) => {
    return fetchAPI('/agencies', {
      method: 'POST',
      body: JSON.stringify(agencyData),
    });
  },

  /**
   * Get agency details by agency_code
   * @param {string} agencyCode - Agency code
   * @returns {Promise<Object>} - Agency details
   */
  getByCode: async (agencyCode) => {
    return fetchAPI(`/agencies/${agencyCode}`);
  },

  /**
   * Upload a rate card for an agency
   * @param {string} agencyCode - Agency code
   * @param {File} file - Rate card file
   * @returns {Promise<Object>} - Upload response
   */
  uploadRateCard: async (agencyCode, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload/agency_rate_card/${agencyCode}`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, let the browser set it with the boundary
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to upload rate card';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use the text as error message
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(`Upload failed: ${errorMessage} (Status: ${response.status})`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Agency rate card upload error:', error);
      throw error;
    }
  },
};

// Job/Invoice-related API functions
export const jobsAPI = {
  /**
   * Get all jobs for an agency
   * @param {string} agencyCode - Agency code
   * @returns {Promise<Array>} - List of jobs/invoices
   */
  getByAgency: async (agencyCode) => {
    // Correcting the endpoint to fetch jobs by agency code directly
    return fetchAPI(`/agencies/${agencyCode}/jobs`);
  },

  /**
   * Get job details by id
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} - Job details
   */
  getById: async (jobId) => {
    return fetchAPI(`/jobs/${jobId}`);
  },

  /**
   * Create a new job/invoice
   * @param {string} agencyCode - Agency code for the job
   * @param {Object} jobData - Job data (title, description, etc)
   * @returns {Promise<Object>} - Created job
   */
  create: async (agencyCode, jobData) => {
    return fetchAPI(`/agencies/${agencyCode}/jobs`, {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  },

  /**
   * Update a job/invoice
   * @param {string} jobId - Job ID
   * @param {Object} jobData - Updated job data
   * @returns {Promise<Object>} - Updated job
   */
  update: async (jobId, jobData) => {
    return fetchAPI(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  },

  /**
   * Upload a document to a job's checklist folder
   * @param {string} jobId - Job ID
   * @param {string} folderType - Type of folder (e.g., agency_invoice)
   * @param {File} file - The file to upload
   * @param {Object} metadata - Optional metadata for the document
   * @returns {Promise<Object>} - The uploaded document details
   */
  uploadDocumentToJob: async (jobId, folderType, file, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/documents/${folderType}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to upload document';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(`Upload failed: ${errorMessage} (Status: ${response.status})`);
      }
      return response.json();
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  },

  /**
   * Delete a document from a job's checklist folder
   * @param {string} jobId - Job ID
   * @param {string} folderType - Type of folder (e.g., agency_invoice)
   * @param {number} documentIndex - Index of the document to delete
   * @returns {Promise<Object>} - Deletion response
   */
  deleteDocumentFromJob: async (jobId, folderType, documentIndex) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/documents/${folderType}/${documentIndex}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to delete document';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(`Delete failed: ${errorMessage} (Status: ${response.status})`);
      }
      return response.json();
    } catch (error) {
      console.error('Document deletion error:', error);
      throw error;
    }
  },

  /**
   * Run AI processing on a job's documents
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} - Updated job with extracted data
   */
  runAIProcess: async (jobId) => {
    try {
      console.log(`Running AI process for job ${jobId}`);
      
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/run_ai_process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to run AI process';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(`AI process failed: ${errorMessage} (Status: ${response.status})`);
      }
      return response.json();
    } catch (error) {
      console.error('AI processing error:', error);
      throw error;
    }
  }
};

// Invoice-related API functions
export const invoicesAPI = {
  /**
   * Get all invoices for an agency
   * @param {string} agencyCode - Agency code
   * @returns {Promise<Array>} - List of invoices
   */
  getByAgency: async (agencyCode) => {
    // Try different possible API formats
    try {
      console.log(`Trying to fetch invoices with agency_id=${agencyCode}`);
      const result = await fetchAPI(`/invoices?agency_id=${agencyCode}`);
      if (result !== null) return result;
      
      // If the first attempt returns null (404), try alternative endpoint
      console.log(`Trying alternative endpoint for invoices with agency_code=${agencyCode}`);
      const altResult = await fetchAPI(`/invoices?agency_code=${agencyCode}`);
      if (altResult !== null) return altResult;
      
      // If both attempts fail, return empty array
      console.log('Both invoice endpoint attempts failed, returning empty array');
      return [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return []; // Return empty array on error
    }
  },

  /**
   * Get invoice details by id
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} - Invoice details
   */
  getById: async (invoiceId) => {
    return fetchAPI(`/invoices/${invoiceId}`);
  },

  /**
   * Create a new invoice
   * @param {Object} invoiceData - Invoice data (agency_id, client_id, job_id, etc)
   * @returns {Promise<Object>} - Created invoice
   */
  create: async (invoiceData) => {
    return fetchAPI('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  }
};

// File-related API functions
export const filesAPI = {
  /**
   * Download a file
   * @param {string} filename - File name
   * @returns {string} - Download URL
   */
  getDownloadUrl: (filename) => {
    return `${API_BASE_URL}/files/${filename}`;
  },
};

// Authentication-related API functions
export const authAPI = {
  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Auth token and user data
   */
  login: async (email, password) => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  /**
   * Get current user data
   * @returns {Promise<Object>} - User data
   */
  getCurrentUser: async () => {
    return fetchAPI('/users/me');
  },
};