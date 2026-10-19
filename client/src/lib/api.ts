import axios from 'axios'

// Same-origin requests: Vite proxies /api to the server, and the session cookie is sent automatically
export const api = axios.create({ baseURL: '/api' })
