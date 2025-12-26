import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid'; 
import { AppView, Report, User, ChatMessage } from './types';
import { ReportList } from './components/ReportList';
import { EvolutionChart } from './components/EvolutionChart';
import { ChatInterface } from './components/ChatInterface';
import { Button } from './components/Button';
import { extractTextFromPdf } from './services/pdfService';
import { authService } from './services/authService';
import { LandingPage } from './components/LandingPage';
import { Plans } from './components/Plans';

const STORAGE_KEY_PREFIX = 'ta_reports_';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [loading, setLoading] = useState(true);

  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // App Functional State
  const [isUploading, setIsUploading] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportDate, setNewReportDate] = useState('');
  const [newReportType, setNewReportType] = useState<Report['type']>('ABA');
  const [newReportContent, setNewReportContent] = useState('');

  // Initial Auth Check
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setView(AppView.DASHBOARD);
    }
    setLoading(false);
  }, []);

  // Multi-tenant Data Loading: Load reports specific to the USER ID
  useEffect(() => {
    if (!currentUser) {
      setReports([]);
      setChatMessages([]);
      return;
    }

    const userStorageKey = `${STORAGE_KEY_PREFIX}${currentUser.id}`;
    const saved = localStorage.getItem(userStorageKey);
    if (saved) {
      try {
        setReports(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse reports", e);
      }
    } else {
      setReports([]);
    }

    // Initialize chat if empty
    if (chatMessages.length === 0) {
      setChatMessages([{
        id: 'welcome',
        role: 'model',
        text: 'Olá. Sou seu assistente especialista em análise de evolução terapêutica. Analisei os relatórios enviados. Como posso ajudar você hoje a entender melhor a evolução ou planejar ações futuras?',
        timestamp: Date.now()
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Persistence: Save to User specific key
  useEffect(() => {
    if (currentUser && reports.length >= 0) {
       const userStorageKey = `${STORAGE_KEY_PREFIX}${currentUser.id}`;
       localStorage.setItem(userStorageKey, JSON.stringify(reports));
    }
  }, [reports, currentUser]);

  // --- Auth Handlers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const user = await authService.login(authEmail);
      setCurrentUser(user);
      setView(AppView.DASHBOARD);
    } catch (err) {
      setAuthError((err as Error).message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const user = await authService.register(authName, authEmail);
      setCurrentUser(user);
      setView(AppView.DASHBOARD);
    } catch (err) {
      setAuthError((err as Error).message);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setView(AppView.LANDING);
    setReports([]);
    setChatMessages([]);
  };

  const handlePlanUpdate = (plan: 'free' | 'pro' | 'semester') => {
    if (!currentUser) return;
    const updatedUser = authService.updatePlan(currentUser.id, plan);
    setCurrentUser(updatedUser);
    
    let planName = 'Básico';
    if (plan === 'pro') planName = 'Profissional (Mensal)';
    if (plan === 'semester') planName = 'Econômico (Semestral)';

    alert(`Plano alterado com sucesso para: ${planName}`);
    setView(AppView.DASHBOARD);
  };

  // --- App Logic ---

  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    
    // GATING: Check limits for free plan
    // Pro and Semester have the same access rights (unlimited)
    const isFree = currentUser?.plan === 'free';
    if (isFree && reports.length >= 3) {
      alert("Você atingiu o limite de 3 relatórios do plano Grátis. Faça upgrade para adicionar mais!");
      setView(AppView.PLANS);
      return;
    }

    if (!newReportTitle || !newReportDate || !newReportContent) return;

    const newReport: Report = {
      id: uuidv4(),
      title: newReportTitle,
      date: newReportDate,
      type: newReportType,
      content: newReportContent
    };

    setReports([...reports, newReport]);
    setNewReportTitle('');
    setNewReportDate('');
    setNewReportContent('');
    setView(AppView.DASHBOARD);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setNewReportContent("Lendo arquivo...");

    try {
      if (file.type === 'application/pdf') {
        const text = await extractTextFromPdf(file);
        setNewReportContent(text);
        setNewReportTitle(file.name.replace(/\.[^/.]+$/, ""));
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setNewReportContent(text);
          setNewReportTitle(file.name.replace(/\.[^/.]+$/, ""));
          setIsUploading(false);
        };
        reader.onerror = () => {
          alert("Erro ao ler arquivo de texto.");
          setIsUploading(false);
        };
        reader.readAsText(file);
        return; 
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar o arquivo. " + (error instanceof Error ? error.message : ""));
      setNewReportContent("");
    } finally {
      if (file.type === 'application/pdf') {
        setIsUploading(false);
      }
    }
  };

  const handleDeleteReport = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este relatório?')) {
      setReports(reports.filter(r => r.id !== id));
    }
  };

  // --- Data Management ---
  const handleExportData = () => {
    const dataStr = JSON.stringify(reports, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tea-analytics-backup-${currentUser?.name || 'user'}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedReports = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedReports)) {
          if (window.confirm(`Isso substituirá seus relatórios atuais. Deseja continuar?`)) {
            setReports(importedReports);
          }
        }
      } catch (err) {
        alert('Erro ao ler arquivo.');
      }
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm('Apagar todos os dados?')) {
      setReports([]);
    }
  };

  // --- Render Views ---

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;

  // PUBLIC VIEWS
  if (!currentUser) {
    if (view === AppView.LOGIN) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
             <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">TA</div>
                  <span className="text-xl font-bold text-teal-900">TEA Analytics</span>
                </div>
             </div>
             <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Entre na sua conta</h2>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500"/>
                </div>
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                <Button type="submit" className="w-full">Entrar</Button>
              </form>
              <div className="mt-6 text-center">
                 <button onClick={() => setView(AppView.REGISTER)} className="text-sm text-teal-600 hover:text-teal-500">Não tem conta? Cadastre-se</button>
                 <br />
                 <button onClick={() => setView(AppView.LANDING)} className="mt-2 text-sm text-gray-500">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (view === AppView.REGISTER) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
             <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">TA</div>
                  <span className="text-xl font-bold text-teal-900">TEA Analytics</span>
                </div>
             </div>
             <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Crie sua conta</h2>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-teal-500 focus:border-teal-500"/>
                </div>
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                <Button type="submit" className="w-full">Criar Conta</Button>
              </form>
              <div className="mt-6 text-center">
                 <button onClick={() => setView(AppView.LOGIN)} className="text-sm text-teal-600 hover:text-teal-500">Já tem conta? Entre</button>
                 <br />
                 <button onClick={() => setView(AppView.LANDING)} className="mt-2 text-sm text-gray-500">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return <LandingPage onLogin={() => setView(AppView.LOGIN)} onRegister={() => setView(AppView.REGISTER)} />;
  }

  // PROTECTED VIEWS (Rendered inside Layout)
  const renderDashboardContent = () => {
    switch (view) {
      case AppView.UPLOAD:
        return (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Adicionar Novo Relatório</h2>
              <Button variant="outline" size="sm" onClick={() => setView(AppView.DASHBOARD)}>Cancelar</Button>
            </div>
            <form onSubmit={handleAddReport} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título do Relatório</label>
                  <input type="text" required value={newReportTitle} onChange={e => setNewReportTitle(e.target.value)} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-teal-500 focus:border-teal-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" required value={newReportDate} onChange={e => setNewReportDate(e.target.value)} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-teal-500 focus:border-teal-500"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={newReportType} onChange={e => setNewReportType(e.target.value as Report['type'])} className="w-full rounded-lg border-gray-300 border p-2 focus:ring-teal-500 focus:border-teal-500">
                  <option value="ABA">ABA</option>
                  <option value="Fonoaudiologia">Fonoaudiologia</option>
                  <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                  <option value="Escolar">Escolar</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <div className="mb-2 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                  <span className="text-sm text-blue-700">Arquivo (.txt, .pdf)?</span>
                  <label className={`cursor-pointer bg-white text-blue-600 px-3 py-1 rounded border border-blue-200 text-sm hover:bg-blue-50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isUploading ? 'Lendo...' : 'Upload'}
                    <input type="file" accept=".txt,.md,.json,.pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>
                <textarea required rows={10} value={newReportContent} onChange={e => setNewReportContent(e.target.value)} className="w-full rounded-lg border-gray-300 border p-2 font-mono text-sm" placeholder="Conteúdo..."/>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" size="lg" disabled={isUploading}>Salvar Relatório</Button>
              </div>
            </form>
          </div>
        );
      case AppView.CHAT:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
               <h2 className="text-xl font-bold text-gray-800">Assistente de Evolução</h2>
               <Button variant="outline" size="sm" onClick={() => setView(AppView.DASHBOARD)}>Voltar</Button>
            </div>
            <ChatInterface 
              reports={reports} 
              messages={chatMessages} 
              setMessages={setChatMessages} 
            />
          </div>
        );
      case AppView.PLANS:
        return (
          <Plans 
            currentUser={currentUser} 
            onSelectPlan={handlePlanUpdate} 
            onCancel={() => setView(AppView.DASHBOARD)} 
          />
        );
      case AppView.DASHBOARD:
      default:
        return (
          <div className="space-y-8 max-w-6xl mx-auto pb-10">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                 <h2 className="text-2xl font-bold text-gray-900">Olá, {currentUser.name}</h2>
                 <p className="text-gray-500">
                   Plano: <span className="font-semibold text-teal-600 uppercase">
                     {currentUser.plan === 'semester' ? 'Econômico' : currentUser.plan === 'pro' ? 'Profissional' : 'Básico'}
                   </span>
                   {currentUser.plan === 'free' && <span className="text-xs ml-2 text-orange-500">(Limite: 3 relatórios)</span>}
                 </p>
               </div>
               <div className="flex gap-3">
                 <Button onClick={() => setView(AppView.UPLOAD)}>Adicionar Relatório</Button>
                 <Button variant="secondary" onClick={() => setView(AppView.CHAT)}>Consultar IA</Button>
               </div>
             </div>
             <section><EvolutionChart reports={reports} /></section>
             <section><ReportList reports={reports} onDelete={handleDeleteReport} /></section>
             <section className="pt-8 mt-8 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Dados</h4>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleExportData} className="text-sm text-blue-600 hover:text-blue-800">Backup</button>
                  <label className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                    Restaurar <input type="file" accept=".json" className="hidden" ref={importInputRef} onChange={handleImportData} />
                  </label>
                  <button onClick={handleClearData} className="text-sm text-red-500 hover:text-red-700 ml-auto">Limpar</button>
                </div>
             </section>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">TA</div>
              <span className="text-xl font-bold text-teal-900 cursor-pointer" onClick={() => setView(AppView.DASHBOARD)}>TEA Analytics</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setView(AppView.PLANS)} className="text-sm font-medium text-teal-600 hover:text-teal-800">Planos</button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-700 hidden sm:block">{currentUser.name}</span>
                 <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">Sair</button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {renderDashboardContent()}
        </div>
      </main>
    </div>
  );
}

export default App;