import { supabase } from './supabaseClient';
import { Report } from '../types';

export const reportService = {
  getAll: async (): Promise<Report[]> => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }

    return data || [];
  },

  create: async (report: Omit<Report, 'id'>): Promise<Report> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          user_id: user.id,
          title: report.title,
          date: report.date,
          type: report.type,
          content: report.content
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      throw error;
    }

    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }
};