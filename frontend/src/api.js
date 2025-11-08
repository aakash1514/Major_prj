import axios from 'axios';

// Create an Axios instance with custom configuration
const api = axios.create({
    // Set the base URL for all requests
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    
    // Set default headers
    // headers: {
        
    //     'Accept': 'application/json'
    // },
    
    // Request timeout in milliseconds
    timeout: 10000
});

// Request interceptor for API calls
api.interceptors.request.use(
    config => {
        // Get the token from localStorage if exists
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

export default api;