import { supabase } from './supabaseClient';
import { User } from '../types';

export const authService = {
  login: async (email: string): Promise<User> => {
    // Magic Link Login (Passwordless)
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false, // User must exist
      }
    });

    if (error) throw new Error(error.message);
    
    throw new Error("Um link de acesso foi enviado para seu email! (Verifique sua caixa de entrada)");
  },

  // Helper for password login if you decide to add password field
  loginWithPassword: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error("No user found");

    return await authService.getUserProfile(data.user.id);
  },

  register: async (name: string, email: string, password?: string): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password || 'TempPass123!', 
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) throw new Error(error.message);

    if (data.user) {
        return {
            id: data.user.id,
            name: name,
            email: email,
            plan: 'free'
        };
    }
    throw new Error("Erro ao criar conta.");
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    return await authService.getUserProfile(session.user.id);
  },

  getUserProfile: async (userId: string): Promise<User> => {
    // Tenta buscar o perfil até 3 vezes (ajuda quando o Trigger do DB é lento na criação)
    let retries = 3;
    
    while (retries > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        return {
          id: data.id,
          name: data.name || 'Usuário',
          email: data.email,
          plan: data.plan as 'free' | 'pro' | 'semester'
        };
      }

      // Se não achou (trigger atrasado), espera 500ms e tenta de novo
      if (error && (error.code === 'PGRST116' || !data)) {
         await new Promise(resolve => setTimeout(resolve, 500));
         retries--;
         continue;
      }
      
      // Se for outro erro, para
      break;
    }

    // Fallback se falhar todas as tentativas
    return { id: userId, name: 'Usuário', email: '', plan: 'free' }; 
  },

  refreshProfile: async (): Promise<User | null> => {
      return await authService.getCurrentUser();
  }
};