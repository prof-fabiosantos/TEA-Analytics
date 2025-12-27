import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de arquivos .env (local) para uso no Node durante o build
  // Use (process as any).cwd() para evitar erro de TS
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Apenas polifilamos process.env para bibliotecas legadas ou uso específico (como API_KEY do Gemini)
      // As variáveis VITE_SUPABASE_* serão injetadas nativamente pelo Vite no import.meta.env
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      // Mantemos um objeto vazio para segurança de libs que acessam process.env.NODE_ENV
      'process.env': {} 
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      target: 'esnext'
    }
  };
});