import { createClient } from '@supabase/supabase-js';

// No Vite, a maneira correta e garantida de acessar variáveis VITE_ é via import.meta.env
// Usamos uma string vazia como fallback para evitar crash imediato, mas validamos depois.
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// --- DEBUG LOG ---
// Isso aparecerá no Console do navegador (F12) para confirmar o que está sendo carregado.
console.log(`[Supabase Init] Tentando conectar...`);
console.log(`[Supabase Init] URL definida: ${supabaseUrl ? supabaseUrl : '(VAZIO)'}`);
console.log(`[Supabase Init] Key definida: ${supabaseAnonKey ? 'Sim (Oculta)' : '(VAZIO)'}`);
// -----------------

// CORREÇÃO AUTOMÁTICA: Se o usuário colocou a string de conexão do banco (postgresql://)
if (supabaseUrl.startsWith('postgresql://')) {
  console.warn("AVISO: Detectada string de conexão DB em VITE_SUPABASE_URL.");
  const match = supabaseUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
    console.log(`[Supabase Init] URL corrigida automaticamente para API: ${supabaseUrl}`);
  }
}

// Validação
const isUrlPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder');
const isKeyPlaceholder = !supabaseAnonKey || supabaseAnonKey.includes('placeholder');

if (!supabaseUrl) {
    console.error("ERRO CRÍTICO: VITE_SUPABASE_URL não encontrada. O app não conseguirá conectar.");
    // Fallback para evitar crash do JS, mas a conexão falhará
    supabaseUrl = 'https://placeholder.supabase.co';
}

if (!supabaseAnonKey) {
    console.error("ERRO CRÍTICO: VITE_SUPABASE_ANON_KEY não encontrada.");
    supabaseAnonKey = 'placeholder-key';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
    return !isUrlPlaceholder && !isKeyPlaceholder;
};