import { createClient } from '@supabase/supabase-js';

// Access environment variables via process.env which is polyfilled in vite.config.ts
let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// CORREÇÃO AUTOMÁTICA: Se o usuário colocou a string de conexão do banco (postgresql://)
// tentamos extrair o ID do projeto para formar a URL correta da API.
if (supabaseUrl.startsWith('postgresql://')) {
  console.warn("AVISO: Você usou a string de conexão do banco (postgresql://) na variável VITE_SUPABASE_URL.");
  console.warn("Tentando corrigir automaticamente para a URL da API (https://...).");
  
  // Tenta extrair o project ref. Ex: ...@db.PROJECT_ID.supabase.co...
  const match = supabaseUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
    console.log(`URL corrigida para: ${supabaseUrl}`);
  }
}

// Fallback para evitar crash se estiver vazio
if (!supabaseUrl) supabaseUrl = 'https://placeholder.supabase.co';

// CRITICAL FIX: createClient lança erro se a chave for vazia. Usamos um placeholder para evitar crash.
if (!supabaseAnonKey) {
    console.warn("VITE_SUPABASE_ANON_KEY está faltando ou vazia. Usando chave placeholder para evitar crash.");
    supabaseAnonKey = 'placeholder-key-to-prevent-crash';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);