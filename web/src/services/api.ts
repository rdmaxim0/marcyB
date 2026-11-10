// Importa a biblioteca Axios, que usamos para fazer requisições HTTP (GET, POST, etc.) para o servidor
import axios from "axios";

// "axios.create" cria uma instância personalizada do Axios com configurações padrão.
// Exportamos na constante "api" para podermos importar em qualquer tela do React.

export const api = axios.create({
    // Define o prefixo automático de todas as chamadas.
    // Ex: quando fizermos api.get('/catalog'), ele vai chamar '/api/catalog',
    // que o nosso Proxy do Vite redireciona para 'http://localhost:3333/api/catalog'.
    baseURL: import.meta.env.VITE_API_URL || 'https://marcyb.onrender.com/api',
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('marcyb_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});