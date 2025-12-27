import { createClient } from '@supabase/supabase-js';

// Helper function to safely get env vars in Vite (local or production)
const getEnvVar = (key: string) => {
  // 1. Tenta o padrão nativo do Vite (import.meta.env)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // 2. Tenta o polyfill do process.env (definido no vite.config.ts)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

let supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
let supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// CORREÇÃO AUTOMÁTICA: Se o usuário colocou a string de conexão do banco (postgresql://)
if (supabaseUrl.startsWith('postgresql://')) {
  console.warn("AVISO: Detectada string de conexão DB em VITE_SUPABASE_URL.");
  const match = supabaseUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
    console.log(`URL corrigida automaticamente para API: ${supabaseUrl}`);
  }
}

// Validação
const isUrlPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder');
const isKeyPlaceholder = !supabaseAnonKey || supabaseAnonKey.includes('placeholder');

if (!supabaseUrl) {
    console.warn("VITE_SUPABASE_URL não encontrada. Usando placeholder.");
    supabaseUrl = 'https://placeholder.supabase.co';
}

if (!supabaseAnonKey) {
    console.warn("VITE_SUPABASE_ANON_KEY não encontrada. Usando placeholder.");
    supabaseAnonKey = 'placeholder-key';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
    return !isUrlPlaceholder && !isKeyPlaceholder;
};