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
  const [authPassword, setAuthPassword] = useState(''); 
  const [authError, setAuthError] = useState('');

  // App Functional State
  const [isUploading, setIsUploading] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportDate, setNewReportDate] = useState('');
  const [newReportType, setNewReportType] = useState<Report['type']>('ABA');
  const [newReportContent, setNewReportContent] = useState('');

  // 1. Initial Auth Check
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (mounted && user) {
          setCurrentUser(user);
          // Tenta carregar dados, mas não bloqueia a UI se falhar
          try {
            await loadUserData(); 
          } catch (dataError) {
            console.error("Erro ao carregar dados:", dataError);
            addToast("Erro ao conectar ao banco. Verifique sua conexão.", "error");
          }
          
          // Verify Payment logic
          const params = new URLSearchParams(window.location.search);
          const sessionId = params.get('session_id');

          if (sessionId) {
             addToast("Verificando pagamento...", "info");
             try {
               const verification = await stripeService.verifySession(sessionId);
               if (verification.verified) {
                 const updatedUser = await authService.refreshProfile();
                 if (mounted) setCurrentUser(updatedUser);
                 addToast("Pagamento confirmado! Plano atualizado.", "success");
               }
             } catch (err) {
               console.error(err);
             } finally {
               window.history.replaceState({}, document.title, window.location.pathname);
             }
          }

          if (mounted) setView(AppView.DASHBOARD);
        }
      } catch (e) {
        console.error("Auth init error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Failsafe: Prevent infinite loading
    const timeoutTimer = setTimeout(() => {
      if (mounted) {
        setLoading((prevLoading) => {
          if (prevLoading) {
            console.warn("Auth check timed out. Force stopping loading.");
            return false;
          }
          return prevLoading;
        });
      }
    }, 4000); // 4 segundos timeout

    // Listen to Supabase Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (event === 'SIGNED_IN' && session) {
          if (mounted) {
            // Apenas atualiza se já não estiver logado para evitar reload desnecessário
            setCurrentUser(prev => prev?.id === session.user.id ? prev : { id: session.user.id, name: 'Carregando...', email: session.user.email || '', plan: 'free' });
            
            const user = await authService.getUserProfile(session.user.id);
            setCurrentUser(user);
            await loadUserData();
            setView(AppView.DASHBOARD);
            setLoading(false);
          }
       } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setCurrentUser(null);
            setReports([]);
            setChatMessages([]);
            setView(AppView.LANDING);
            setLoading(false);
          }
       }
    });
    
    checkSession().then(() => clearTimeout(timeoutTimer));

    return () => {
      mounted = false;
      clearTimeout(timeoutTimer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const data = await reportService.getAll();
      setReports(data);
      
      setChatMessages([{
        id: 'welcome',
        role: 'model',
        text: 'Olá. Sou seu assistente especialista em análise de evolução terapêutica. Analisei os relatórios do banco de dados. Como posso ajudar?',
        timestamp: Date.now()
      }]);
    } catch (e) {
      console.error(e);
      // Não joga erro para não quebrar o checkSession
    }
  };

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await authService.loginWithPassword(authEmail, authPassword);
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

      setReports([newReport, ...reports]); 
      setNewReportTitle('');
      setNewReportDate('');
      setNewReportContent('');
      setView(AppView.DASHBOARD);
      addToast("Relatório salvo na nuvem!", "success");
    } catch (e: any) {
      console.error("Failed to save report:", e);
      addToast(`Erro ao salvar: ${e.message || 'Verifique o console'}`, "error");
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
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      <p className="text-gray-500 text-sm">Conectando ao banco de dados...</p>
      <button 
        onClick={() => setLoading(false)} 
        className="text-xs text-blue-500 underline mt-4"
      >
        Demorando muito? Cancelar carregamento
      </button>
    </div>
  );

  // AUTH VIEWS
  if (!currentUser) {
    if (view === AppView.LOGIN) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
             <div className="flex justify-center mb-4">
               <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">TA</div>
             </div>
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
                {authError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{authError}</p>}
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
                {authError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{authError}</p>}
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
                      <option value="Avaliação de Atividades">Avaliação de Atividades</option>
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