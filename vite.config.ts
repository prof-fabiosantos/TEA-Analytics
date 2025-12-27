import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de arquivos .env (local)
  // Use (process as any) to avoid TS error: Property 'cwd' does not exist on type 'Process'
  const envFile = loadEnv(mode, (process as any).cwd(), '');
  
  // Mescla variáveis do sistema (Vercel/Node) com as do arquivo .env
  // Isso garante que as variáveis definidas no Painel da Vercel sejam vistas aqui
  const processEnv = { ...process.env, ...envFile };

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env para compatibilidade, injetando os valores reais do build
      'process.env.API_KEY': JSON.stringify(processEnv.API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(processEnv.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(processEnv.VITE_SUPABASE_ANON_KEY)
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