import React, { useState, useEffect, useRef } from 'react';
import { AppView, Report, User, ChatMessage } from './types';
import { ReportList } from './components/ReportList';
import { EvolutionChart } from './components/EvolutionChart';
import { ChatInterface } from './components/ChatInterface';
import { Button } from './components/Button';
import { extractTextFromPdf } from './services/pdfService';
import { authService } from './services/authService';
import { reportService } from './services/reportService';
import { stripeService } from './services/stripeService';
import { LandingPage } from './components/LandingPage';
import { Plans } from './components/Plans';
import { useToast } from './contexts/ToastContext';
import { supabase } from './services/supabaseClient';

function App() {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [loading, setLoading] = useState(true);

  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState(''); // Added password state
  const [authError, setAuthError] = useState('');

  // App Functional State
  const [isUploading, setIsUploading] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportDate, setNewReportDate] = useState('');
  const [newReportType, setNewReportType] = useState<Report['type']>('ABA');
  const [newReportContent, setNewReportContent] = useState('');

  // 1. Initial Auth Check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          await loadUserData(); // Fetch reports
          
          // Verify Payment logic
          const params = new URLSearchParams(window.location.search);
          const sessionId = params.get('session_id');

          if (sessionId) {
             addToast("Verificando pagamento...", "info");
             try {
               const verification = await stripeService.verifySession(sessionId);
               if (verification.verified) {
                 // Refresh user profile to get new plan
                 const updatedUser = await authService.refreshProfile();
                 setCurrentUser(updatedUser);
                 addToast("Pagamento confirmado! Plano atualizado.", "success");
               } else {
                 addToast("Pagamento pendente ou não confirmado.", "warning");
               }
             } catch (err) {
               console.error(err);
             } finally {
               window.history.replaceState({}, document.title, window.location.pathname);
             }
          }

          setView(AppView.DASHBOARD);
        }
      } catch (e) {
        console.error("Auth init error", e);
      } finally {
        setLoading(false);
      }
    };

    // Listen to Supabase Auth Changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (event === 'SIGNED_IN' && session) {
          const user = await authService.getUserProfile(session.user.id);
          setCurrentUser(user);
          await loadUserData();
          setView(AppView.DASHBOARD);
       } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setReports([]);
          setChatMessages([]);
          setView(AppView.LANDING);
       }
    });
    
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const data = await reportService.getAll();
      setReports(data);
      
      // Reset Chat
      setChatMessages([{
        id: 'welcome',
        role: 'model',
        text: 'Olá. Sou seu assistente especialista em análise de evolução terapêutica. Analisei os relatórios do banco de dados. Como posso ajudar?',
        timestamp: Date.now()
      }]);
    } catch (e) {
      console.error(e);
      addToast("Erro ao carregar dados.", "error");
    }
  };

  // --- Auth Handlers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      // Trying password login first
      await authService.loginWithPassword(authEmail, authPassword);
      // State update happens in onAuthStateChange
      addToast("Login realizado com sucesso!", "success");
    } catch (err) {
      setAuthError((err as Error).message);
      addToast("Falha no login. Verifique email/senha.", "error");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await authService.register(authName, authEmail, authPassword);
      addToast("Conta criada! Verifique seu email para confirmar.", "success");
      // Supabase usually requires email confirmation or auto-login depending on settings
    } catch (err) {
      setAuthError((err as Error).message);
      addToast((err as Error).message, "error");
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    addToast("Você saiu da conta.", "info");
  };

  const handlePlanUpdate = (plan: 'free' | 'pro' | 'semester') => {
    // This function is just for UI updates optimistically in some apps, 
    // but here we rely on the payment flow returning to the app to update the DB.
    // However, if manual update needed:
    // authService.updatePlan(currentUser.id, plan); // Not implemented client side securely
    console.log("Plan selection initiated", plan);
  };

  // --- App Logic ---

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isFree = currentUser?.plan === 'free';
    if (isFree && reports.length >= 3) {
      addToast("Limite do plano Grátis atingido. Faça upgrade!", "warning");
      setView(AppView.PLANS);
      return;
    }

    if (!newReportTitle || !newReportDate || !newReportContent) {
      addToast("Preencha todos os campos.", "error");
      return;
    }

    try {
      setIsUploading(true);
      const newReport = await reportService.create({
        title: newReportTitle,
        date: newReportDate,
        type: newReportType,
        content: newReportContent
      });

      setReports([newReport, ...reports]); // Add to top
      setNewReportTitle('');
      setNewReportDate('');
      setNewReportContent('');
      setView(AppView.DASHBOARD);
      addToast("Relatório salvo na nuvem!", "success");
    } catch (e) {
      addToast("Erro ao salvar relatório.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast("Arquivo muito grande (Máx 5MB).", "error");
      return;
    }

    setIsUploading(true);
    setNewReportContent("Processando arquivo...");

    try {
      if (file.type === 'application/pdf') {
        const text = await extractTextFromPdf(file);
        if (!text || text.trim().length < 10) throw new Error("PDF sem texto legível.");
        setNewReportContent(text);
        setNewReportTitle(file.name.replace(/\.[^/.]+$/, ""));
        addToast("PDF processado!", "success");
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
            setNewReportContent(ev.target?.result as string);
            setNewReportTitle(file.name.replace(/\.[^/.]+$/, ""));
            setIsUploading(false);
        };
        reader.readAsText(file);
        return;
      }
    } catch (error) {
      addToast("Erro no upload.", "error");
      setNewReportContent("");
    } finally {
      if (file.type === 'application/pdf') setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm('Excluir este relatório?')) {
      try {
        await reportService.delete(id);
        setReports(reports.filter(r => r.id !== id));
        addToast("Relatório removido.", "info");
      } catch (e) {
        addToast("Erro ao excluir.", "error");
      }
    }
  };

  // --- Data Management (Local JSON export still useful) ---
  const handleExportData = () => {
      const dataStr = JSON.stringify(reports, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
    </div>
  );

  // AUTH VIEWS
  if (!currentUser) {
    if (view === AppView.LOGIN) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
             <h2 className="text-center text-3xl font-extrabold text-gray-900">Login</h2>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Senha</label>
                  <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2"/>
                </div>
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                <Button type="submit" className="w-full">Entrar</Button>
              </form>
              <div className="mt-6 text-center">
                 <button onClick={() => setView(AppView.REGISTER)} className="text-sm text-teal-600">Criar conta</button>
                 <br/><button onClick={() => setView(AppView.LANDING)} className="text-sm text-gray-500 mt-2">Voltar</button>
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
             <h2 className="text-center text-3xl font-extrabold text-gray-900">Cadastro</h2>
          </div>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome</label>
                  <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Senha</label>
                  <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2"/>
                </div>
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                <Button type="submit" className="w-full">Cadastrar</Button>
              </form>
               <div className="mt-6 text-center">
                 <button onClick={() => setView(AppView.LOGIN)} className="text-sm text-teal-600">Já tem conta? Entre</button>
                 <br/><button onClick={() => setView(AppView.LANDING)} className="text-sm text-gray-500 mt-2">Voltar</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return <LandingPage onLogin={() => setView(AppView.LOGIN)} onRegister={() => setView(AppView.REGISTER)} />;
  }

  // DASHBOARD CONTENT RENDERER
  const renderDashboardContent = () => {
    switch (view) {
      case AppView.UPLOAD:
        const isFreeUser = currentUser?.plan === 'free';
        const limitReached = isFreeUser && reports.length >= 3;
        
        return (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-md animate-fade-in">
             <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">Novo Relatório</h2>
                <Button variant="outline" size="sm" onClick={() => setView(AppView.DASHBOARD)}>Cancelar</Button>
             </div>
             {limitReached ? (
               <div className="text-center py-10 bg-gray-50 border border-dashed rounded-xl">
                 <h3 className="text-lg font-medium text-gray-900">Limite Atingido (3/3)</h3>
                 <p className="text-sm text-gray-500 mb-4">Faça upgrade para continuar.</p>
                 <Button onClick={() => setView(AppView.PLANS)}>Ver Planos</Button>
               </div>
             ) : (
                <form onSubmit={handleAddReport} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium block">Título</label>
                       <input className="w-full border p-2 rounded" value={newReportTitle} onChange={e=>setNewReportTitle(e.target.value)} required />
                     </div>
                     <div>
                       <label className="text-sm font-medium block">Data</label>
                       <input type="date" className="w-full border p-2 rounded" value={newReportDate} onChange={e=>setNewReportDate(e.target.value)} required />
                     </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block">Tipo</label>
                    <select className="w-full border p-2 rounded" value={newReportType} onChange={e=>setNewReportType(e.target.value as any)}>
                      <option value="ABA">ABA</option>
                      <option value="Fonoaudiologia">Fonoaudiologia</option>
                      <option value="Terapia Ocupacional">T.O.</option>
                      <option value="Escolar">Escolar</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-medium">Conteúdo</label>
                      <label className="text-xs text-blue-600 cursor-pointer">
                        Upload PDF/Txt <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.txt" disabled={isUploading}/>
                      </label>
                    </div>
                    <textarea className="w-full border p-2 rounded h-40" value={newReportContent} onChange={e=>setNewReportContent(e.target.value)} required placeholder="Cole o texto ou faça upload..."></textarea>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUploading}>{isUploading ? 'Salvando...' : 'Salvar Relatório'}</Button>
                  </div>
                </form>
             )}
          </div>
        );
      case AppView.CHAT:
        return (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Assistente IA</h2>
              <Button variant="outline" size="sm" onClick={() => setView(AppView.DASHBOARD)}>Voltar</Button>
            </div>
            <ChatInterface reports={reports} messages={chatMessages} setMessages={setChatMessages} />
          </div>
        );
      case AppView.PLANS:
        return <Plans currentUser={currentUser} onSelectPlan={handlePlanUpdate} onCancel={() => setView(AppView.DASHBOARD)} />;
      default:
        return (
          <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
             <div className="flex justify-between items-center">
               <div>
                 <h2 className="text-2xl font-bold">Olá, {currentUser.name}</h2>
                 <p className="text-gray-500 text-sm">Plano: <span className="font-bold uppercase text-teal-600">{currentUser.plan}</span></p>
               </div>
               <div className="flex gap-2">
                 <Button onClick={() => setView(AppView.UPLOAD)}>+ Relatório</Button>
                 <Button variant="secondary" onClick={() => setView(AppView.CHAT)}>IA Chat</Button>
               </div>
             </div>
             
             {currentUser.plan === 'free' && (
               <div className="bg-orange-50 border-l-4 border-orange-400 p-3 text-sm text-orange-700 flex justify-between items-center">
                 <span>Você tem {3 - reports.length} relatórios restantes no plano grátis.</span>
                 <button onClick={() => setView(AppView.PLANS)} className="underline font-bold">Upgrade</button>
               </div>
             )}

             <EvolutionChart reports={reports} />
             <ReportList reports={reports} onDelete={handleDeleteReport} />
             
             <div className="pt-4 border-t flex gap-4">
                <button onClick={handleExportData} className="text-sm text-blue-600">Exportar Backup Local</button>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
       <nav className="bg-white border-b px-4 py-3 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(AppView.DASHBOARD)}>
               <div className="w-8 h-8 bg-teal-600 rounded text-white flex items-center justify-center font-bold">TA</div>
               <span className="font-bold text-teal-900 text-lg">TEA Analytics</span>
             </div>
             <div className="flex gap-4 items-center">
                <button onClick={() => setView(AppView.PLANS)} className="text-sm text-teal-600 font-medium">Planos</button>
                <button onClick={handleLogout} className="text-sm text-gray-500">Sair</button>
             </div>
          </div>
       </nav>
       <main className="p-4 md:p-8">
          {renderDashboardContent()}
       </main>
    </div>
  );
}

export default App;