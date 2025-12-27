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
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

function App() {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState(''); 
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

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
        if (!isSupabaseConfigured()) {
            console.warn("Supabase não configurado. Pulando verificação de sessão.");
            return;
        }

        // Recupera params da URL
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        const canceled = params.get('canceled');

        // Limpa URL imediatamente para evitar loops
        if (sessionId || canceled) {
           window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (canceled) {
            addToast("Pagamento cancelado.", "info");
        }

        // Tenta buscar usuário atual (Sessão)
        // Isso deve rodar independente do status do pagamento para garantir login
        let user = await authService.getCurrentUser();

        // Lógica de Pagamento
        if (sessionId) {
            setPaymentProcessing(true);
            try {
              // Verifica no backend
              const verification = await stripeService.verifySession(sessionId);
              
              if (verification.verified) {
                addToast("Pagamento confirmado! Plano atualizado.", "success");
                
                // Força atualização local se o usuário já estiver carregado
                if (user) {
                    const forcedUser: User = { ...user, plan: verification.plan };
                    if (mounted) {
                        setCurrentUser(forcedUser);
                        user = forcedUser;
                    }
                }
              } else {
                 // Pagamento não verificado, mas deixamos o usuário entrar como Free
                 addToast("Status do pagamento pendente. Verifique seu plano em instantes.", "info");
              }
            } catch (err) {
              console.error("Erro verificação pagamento:", err);
              addToast("Não foi possível confirmar o pagamento automaticamente. Entre em contato se o plano não atualizar.", "warning");
            } finally {
              if (mounted) setPaymentProcessing(false);
            }
        } 

        // Finaliza Setup
        if (mounted) {
            if (user) {
                setCurrentUser(user);
                await loadUserData();
                setView(AppView.DASHBOARD);
            } else if (sessionId) {
                // Se pagou mas não achamos a sessão (browser diferente ou cookie perdido), pede login
                addToast("Pagamento recebido! Faça login para acessar.", "success");
                setView(AppView.LOGIN);
            }
        }

      } catch (e) {
        console.error("Auth init error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Failsafe timer (caso checkSession trave muito)
    const timeoutTimer = setTimeout(() => {
      if (mounted && loading) setLoading(false);
    }, 5000);

    // Listen to Supabase Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          if (mounted) {
            // Se já temos um usuário carregado e verificado, não sobrescrevemos desnecessariamente
            // a menos que seja um login novo
            if (!currentUser || event === 'SIGNED_IN') {
                 const userProfile = await authService.getUserProfile(session.user.id);
                 setCurrentUser(userProfile);
                 await loadUserData();
                 setView(AppView.DASHBOARD);
            }
            setLoading(false);
            setAuthLoading(false);
          }
       } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setCurrentUser(null);
            setReports([]);
            setChatMessages([]);
            setView(AppView.LANDING);
            setLoading(false);
            setAuthLoading(false);
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
      if (!isSupabaseConfigured()) return;
      
      const data = await reportService.getAll();
      setReports(data);
      
      setChatMessages(prev => {
        if (prev.length > 0) return prev;
        return [{
          id: 'welcome',
          role: 'model',
          text: 'Olá. Sou seu assistente especialista em análise de evolução terapêutica. Analisei os relatórios do banco de dados. Como posso ajudar?',
          timestamp: Date.now()
        }];
      });
    } catch (e) {
      console.error("Erro carregando dados:", e);
    }
  };

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;

    if (!isSupabaseConfigured()) {
        addToast("CONFIGURAÇÃO AUSENTE: Conecte o projeto ao Supabase nas variáveis de ambiente.", "error");
        return;
    }

    setAuthError('');
    setAuthLoading(true);

    try {
      // O authService agora tem timeout interno no DB fetch.
      // O loginAuth é rápido.
      await authService.loginWithPassword(authEmail, authPassword);
      
      addToast("Login realizado com sucesso!", "success");
      
      // A mudança de estado acontece via onAuthStateChange listener
      // Mas garantimos limpeza do loading aqui caso algo falhe
      setTimeout(() => {
          if (authLoading) setAuthLoading(false);
      }, 3000);

    } catch (err: any) {
      console.error("Login Error Details:", err);
      setAuthError(err.message || "Erro desconhecido ao tentar logar.");
      
      if (err.message?.includes('Invalid login credentials')) {
         addToast("Email ou senha incorretos.", "error");
      } else {
         addToast(err.message || "Falha no login.", "error");
      }
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;

    if (!isSupabaseConfigured()) {
        addToast("CONFIGURAÇÃO AUSENTE: Conecte o projeto ao Supabase.", "error");
        return;
    }
    
    setAuthError('');
    setAuthLoading(true);

    try {
      const registerPromise = authService.register(authName, authEmail, authPassword);
      // Timeout seguro para UI
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("O servidor demorou muito para responder. Tente novamente.")), 30000)
      );

      await Promise.race([registerPromise, timeoutPromise]);
      
      addToast("Conta criada! Verifique seu email para confirmar antes de entrar.", "success");
      setAuthLoading(false);
    } catch (err: any) {
      console.error("Register Error Details:", err);
      setAuthError(err.message || "Erro ao criar conta.");
      addToast(err.message, "error");
      setAuthLoading(false);
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

    if (!newReportContent || newReportContent.trim().length === 0) {
      addToast("Conteúdo vazio.", "error");
      return;
    }

    if (!newReportTitle || !newReportDate) {
      addToast("Preencha título e data.", "error");
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
      addToast("Relatório salvo!", "success");
    } catch (e: any) {
      addToast(`Erro ao salvar: ${e.message}`, "error");
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
    setNewReportContent("Lendo arquivo... aguarde.");

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        const text = await extractTextFromPdf(file);
        setNewReportContent(text);
        setNewReportTitle(file.name.replace(/\.[^.]+$/, ""));
        addToast("PDF processado!", "success");
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            setNewReportContent(text || "");
            setNewReportTitle(file.name.replace(/\.[^.]+$/, ""));
            setIsUploading(false);
        };
        reader.readAsText(file);
        return; 
      }
    } catch (error: any) {
      addToast(`Erro: ${error.message}`, "error");
      setNewReportContent(""); 
    } finally {
      setIsUploading(false);
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

  if (loading || paymentProcessing) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      <p className="text-gray-500 text-sm">
        {paymentProcessing ? "Validando pagamento..." : "Carregando TEA Analytics..."}
      </p>
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
                <Button type="submit" className="w-full" disabled={authLoading}>
                   {authLoading ? (
                     <span className="flex items-center justify-center gap-2">
                       <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                       Entrando...
                     </span>
                   ) : "Entrar"}
                </Button>
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
                <Button type="submit" className="w-full" disabled={authLoading}>
                    {authLoading ? (
                     <span className="flex items-center justify-center gap-2">
                       <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                       Cadastrando...
                     </span>
                   ) : "Cadastrar"}
                </Button>
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
                    <textarea 
                      className="w-full border p-2 rounded h-40" 
                      value={newReportContent} 
                      onChange={e=>setNewReportContent(e.target.value)} 
                      required 
                      placeholder="Cole o texto ou faça upload..."
                      disabled={isUploading}
                    ></textarea>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUploading || !newReportContent.trim()}>
                      {isUploading ? 'Processando...' : 'Salvar Relatório'}
                    </Button>
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