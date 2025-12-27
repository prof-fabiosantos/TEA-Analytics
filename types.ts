export interface Report {
  id: string;
  title: string;
  date: string;
  content: string;
  type: 'ABA' | 'Fonoaudiologia' | 'Terapia Ocupacional' | 'Escolar' | 'Outro';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface EvolutionMetric {
  date: string;
  comunicacao: number;
  interacaoSocial: number;
  comportamento: number;
  autonomia: number;
  summary: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'semester';
}

export interface RAGChunk {
  id: string;
  reportId: string;
  reportDate: string;
  reportType: string;
  content: string;
  embedding?: number[];
}

export enum AppView {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  CHAT = 'CHAT',
  PLANS = 'PLANS'
}