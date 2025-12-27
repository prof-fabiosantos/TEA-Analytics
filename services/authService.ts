import { supabase } from './supabaseClient';
import { User } from '../types';

export const authService = {
  login: async (email: string): Promise<User> => {
    // Magic Link Login (Passwordless) is easier for UX, but for simplicity we assume 
    // the UI is asking for password or using Magic Link. 
    // Since the original UI didn't have password field, let's use Magic Link (OTP) or simple SignIn
    // NOTE: To keep original UI working without adding password field, we trigger OTP.
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false, // User must exist
      }
    });

    if (error) throw new Error(error.message);
    
    // In a real OTP flow, the user needs to check email. 
    // However, to mimic the 'instant' feel of the previous demo for this specific prompt response,
    // we would typically need a password field.
    // For now, let's assume the user checks their email or we switch to Password based login if you add a password input.
    
    // CRITICAL ADAPTATION: Since we can't easily add a password input to the existing <App /> 
    // within this constraints without changing too much UI logic, we will assume 
    // the user clicks the link in email.
    
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
    // We register with a temporary password or Magic Link. 
    // Let's use a default flow.
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password || 'TempPass123!', // In prod, add password field to UI
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) throw new Error(error.message);

    // Profile is created via Database Trigger (see SQL instructions)
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
        // Fallback if profile trigger failed
        return { id: userId, name: 'User', email: '', plan: 'free' }; 
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      plan: data.plan as 'free' | 'pro' | 'semester'
    };
  },

  // Plan updates are now handled by the Backend (verify-payment) via Stripe Webhook or Verification
  // But we can force a refresh on the frontend
  refreshProfile: async (): Promise<User | null> => {
      return await authService.getCurrentUser();
  }
};