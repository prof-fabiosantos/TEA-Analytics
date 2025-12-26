import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Simula um banco de dados de usuários no localStorage
const USERS_KEY = 'ta_saas_users';
const CURRENT_USER_KEY = 'ta_saas_current_user';

export const authService = {
  login: async (email: string): Promise<User> => {
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('Usuário não encontrado. Crie uma conta.');
    }
    
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  register: async (name: string, email: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const usersStr = localStorage.getItem(USERS_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    if (users.find(u => u.email === email)) {
      throw new Error('Email já cadastrado.');
    }

    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      plan: 'free' // Padrão free
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    
    return newUser;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  updatePlan: (userId: string, plan: 'free' | 'pro' | 'semester') => {
    const usersStr = localStorage.getItem(USERS_KEY);
    let users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    users = users.map(u => u.id === userId ? { ...u, plan } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Atualiza sessão atual se for o mesmo usuário
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, plan };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    }
    return currentUser;
  }
};