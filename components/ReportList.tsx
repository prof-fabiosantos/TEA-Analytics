import React from 'react';
import { Report } from '../types';

interface ReportListProps {
  reports: Report[];
  onDelete: (id: string) => void;
}

export const ReportList: React.FC<ReportListProps> = ({ reports, onDelete }) => {
  if (reports.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500">Nenhum relatório cadastrado ainda.</p>
      </div>
    );
  }

  const sortedReports = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Histórico de Documentos</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedReports.map((report) => (
          <div key={report.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 rounded text-xs font-semibold 
                ${report.type === 'ABA' ? 'bg-blue-100 text-blue-800' : 
                  report.type === 'Fonoaudiologia' ? 'bg-green-100 text-green-800' :
                  report.type === 'Terapia Ocupacional' ? 'bg-purple-100 text-purple-800' : 
                  'bg-gray-100 text-gray-800'}`}>
                {report.type}
              </span>
              <button 
                onClick={() => onDelete(report.id)}
                className="text-gray-400 hover:text-red-500"
                aria-label="Deletar relatório"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
            <h4 className="font-medium text-gray-900 truncate" title={report.title}>{report.title}</h4>
            <p className="text-sm text-gray-500 mb-3">{new Date(report.date).toLocaleDateString('pt-BR')}</p>
            <p className="text-xs text-gray-400 line-clamp-3 bg-gray-50 p-2 rounded">
              {report.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};