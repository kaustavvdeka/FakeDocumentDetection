const API_BASE_URL = 'http://localhost:5001/api';

export const api = {
  // Documents
  registerDocument: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/documents/register`, {
      method: 'POST',
      body: formData, // FormData containing file and metadata
    });
    return res.json();
  },
  
  getDocument: async (hash) => {
    const res = await fetch(`${API_BASE_URL}/documents/${hash}`);
    return res.json();
  },

  // Verify
  verifyByUpload: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/verify/document`, {
      method: 'POST',
      body: formData, // FormData containing file
    });
    return res.json();
  },

  verifyByHash: async (hash) => {
    const res = await fetch(`${API_BASE_URL}/verify/hash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
    });
    return res.json();
  },

  // AI
  analyzeDocument: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
      method: 'POST',
      body: formData, // FormData containing file
    });
    return res.json();
  },

  // Stats
  getStats: async () => {
    const res = await fetch(`${API_BASE_URL}/stats`);
    return res.json();
  }
};
