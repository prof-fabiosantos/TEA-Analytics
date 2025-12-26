import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Report, EvolutionMetric } from '../types';
import { analyzeEvolution } from '../services/geminiService';

interface EvolutionChartProps {
  reports: Report[];
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({ reports }) => {
  const [data, setData] = useState<EvolutionMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (reports.length < 2) return; // Need at least 2 points to show a line
      
      setLoading(true);
      setError(null);
      try {
        const result = await analyzeEvolution(reports);
        setData(result);
      } catch (e) {
        setError("Não foi possível gerar o gráfico de evolução no momento.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports.length]); // Only re-analyze if report count changes to save tokens

  if (reports.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500 text-center px-4">
          Adicione pelo menos 2 relatórios com datas diferentes para visualizar o gráfico de evolução.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-2"></div>
        <p className="text-gray-500 text-sm">Analisando evolução...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center bg-white rounded-xl border border-gray-200">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Format date for chart
  const formattedData = data.map(d => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  }));

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Evolução Qualitativa Estimada (0-10)</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="displayDate" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend />
            <Line type="monotone" dataKey="comunicacao" name="Comunicação" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="interacaoSocial" name="Interação Social" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="comportamento" name="Comportamento" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="autonomia" name="Autonomia" stroke="#ea580c" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};