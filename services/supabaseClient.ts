import { createClient } from '@supabase/supabase-js';

// Função auxiliar para tentar pegar variável do import.meta.env de forma segura
const getMetaEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return undefined;
};

// Tenta recuperar URL e KEY de várias fontes possíveis
// A ordem é: import.meta.env (Vite) -> process.env (Define Plugin/Node) -> Fallbacks de nome
const getSupabaseUrl = () => {
  return getMetaEnv('VITE_SUPABASE_URL') || 
         getMetaEnv('SUPABASE_URL') || 
         process.env.VITE_SUPABASE_URL || 
         process.env.SUPABASE_URL || 
         '';
};

const getSupabaseKey = () => {
  return getMetaEnv('VITE_SUPABASE_ANON_KEY') || 
         getMetaEnv('SUPABASE_ANON_KEY') || 
         getMetaEnv('SUPABASE_KEY') || 
         process.env.VITE_SUPABASE_ANON_KEY || 
         process.env.SUPABASE_ANON_KEY || 
         '';
};

let supabaseUrl = getSupabaseUrl();
let supabaseAnonKey = getSupabaseKey();

// --- DEBUG LOG ---
console.log(`[Supabase Init] URL Length: ${supabaseUrl?.length || 0}`);
// -----------------

// CORREÇÃO AUTOMÁTICA: Se o usuário colocou a string de conexão do banco (postgresql://)
if (supabaseUrl && supabaseUrl.startsWith('postgresql://')) {
  console.warn("AVISO: Detectada string de conexão DB em VITE_SUPABASE_URL.");
  const match = supabaseUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
    console.log(`[Supabase Init] URL corrigida automaticamente para API: ${supabaseUrl}`);
  }
}

const isUrlPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder');
const isKeyPlaceholder = !supabaseAnonKey || supabaseAnonKey.includes('placeholder');

if (!supabaseUrl || isUrlPlaceholder) {
    console.warn("AVISO CRÍTICO: VITE_SUPABASE_URL não encontrada ou inválida. O app usará placeholder (funcionalidade limitada).");
    supabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
}

if (!supabaseAnonKey || isKeyPlaceholder) {
    console.warn("AVISO CRÍTICO: VITE_SUPABASE_ANON_KEY não encontrada.");
    supabaseAnonKey = supabaseAnonKey || 'placeholder-key';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
    return !isUrlPlaceholder && !isKeyPlaceholder;
};