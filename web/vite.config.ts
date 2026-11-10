// Importa a função auxiliar do Vite que dá autocompletar e checagem de tipos na configuração
import { defineConfig } from 'vite';

// Importa o plugin oficial que faz o Vite entender React (JSX/TSX) e atualizar a tela sem recarregar (HMR)
import react from '@vitejs/plugin-react';


// Exporta a configuração do servidor de desenvolvimento e de build do Frontend
export default defineConfig({
  plugins: [react()],
  server: {
    // Fixa a porta do nosso site em 5173
    port: 5173,
    // Configura o Proxy Reverso: toda requisição para "/api" vai direto para o nosso Backend na 3333
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true, // Ajusta o cabeçalho "Host" da requisição para evitar bloqueios
      }

    }
  }
})