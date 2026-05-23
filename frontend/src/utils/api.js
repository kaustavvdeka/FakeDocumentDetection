const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const api = {
  // Documents
  registerDocument: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/documents/register`, {
      method: 'POST',
      body: formData, // FormData containing file and metadata
    });
    return res.json();
  },
  
  registerDocumentBatch: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/documents/register-batch`, {
      method: 'POST',
      body: formData,
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
  analyzeForgery: async (formData) => {
    const res = await fetch(`${API_BASE_URL}/ai/analyze-forgery`, {
      method: 'POST',
      body: formData, // FormData containing file
    });
    return res.json();
  },
  
  analyzeText: async (textData) => {
    const res = await fetch(`${API_BASE_URL}/ai/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(textData),
    });
    return res.json();
  },

  // Stats
  getStats: async () => {
    const res = await fetch(`${API_BASE_URL}/stats`);
    return res.json();
  }
};
