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
    // 1. Obtém dados da sessão como fonte de verdade primária (Rápido e Garantido)
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    
    // Objeto de fallback imediato
    const fallbackUser: User = { 
        id: userId, 
        name: sessionUser?.user_metadata?.name || 'Usuário', 
        email: sessionUser?.email || '', 
        plan: 'free' 
    };

    // 2. Tenta buscar o perfil no banco de dados com um TIMEOUT RIGOROSO
    // Se o banco (tabela profiles) estiver travado, lento ou inexistente,
    // retornamos o fallback em 4 segundos para não travar a tela de login.
    try {
      const dbPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("DB_TIMEOUT")), 4000)
      );

      // Race: Quem chegar primeiro ganha.
      const result: any = await Promise.race([dbPromise, timeoutPromise]);

      if (result.data) {
        return {
          id: result.data.id,
          name: result.data.name || fallbackUser.name,
          email: result.data.email || fallbackUser.email,
          plan: result.data.plan as 'free' | 'pro' | 'semester'
        };
      }
      
      // Se retornou do DB mas sem dados (ex: usuário deletado do profile mas não do auth)
      if (result.error && result.error.code !== 'PGRST116') {
         console.warn("Erro não-crítico ao buscar profile:", result.error.message);
      }
      
    } catch (e: any) {
      if (e.message === "DB_TIMEOUT") {
        console.warn("AuthService: Banco de dados demorou para responder. Usando perfil de sessão (Fallback) para permitir login.");
      } else {
        console.error("Erro ao recuperar perfil do DB:", e);
      }
    }

    // Retorna o fallback para garantir o acesso
    return fallbackUser; 
  },

  refreshProfile: async (): Promise<User | null> => {
      return await authService.getCurrentUser();
  }
};