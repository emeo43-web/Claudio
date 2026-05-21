import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Jobs
export const getJobs = (params) => api.get('/jobs', { params }).then(r => r.data)
export const getJob = (id) => api.get(`/jobs/${id}`).then(r => r.data)
export const updateJobStatus = (id, status) =>
  api.patch(`/jobs/${id}/status`, { status }).then(r => r.data)
export const generateCV = (jobId) =>
  api.post(`/jobs/${jobId}/generate-cv`).then(r => r.data)
export const applyToJob = (jobId) =>
  api.post(`/jobs/${jobId}/apply`).then(r => r.data)
export const deleteJob = (id) => api.delete(`/jobs/${id}`).then(r => r.data)

// Applications
export const getApplications = (params) =>
  api.get('/applications', { params }).then(r => r.data)
export const getApplication = (id) =>
  api.get(`/applications/${id}`).then(r => r.data)
export const updateApplication = (id, data) =>
  api.patch(`/applications/${id}`, data).then(r => r.data)

// Profile
export const getProfile = () => api.get('/profile').then(r => r.data)
export const updateProfile = (data) => api.put('/profile', data).then(r => r.data)
export const getSearchConfig = () => api.get('/profile/search-config').then(r => r.data)
export const updateSearchConfig = (data) =>
  api.put('/profile/search-config', data).then(r => r.data)

// Stats
export const getStats = () => api.get('/stats').then(r => r.data)

// Scraper
export const triggerScrape = () => api.post('/scraper/run').then(r => r.data)
export const getScrapeLogs = () => api.get('/scraper/logs').then(r => r.data)
