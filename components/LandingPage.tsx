import React from 'react';
import { Button } from './Button';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="bg-white">
      {/* Navbar/Header for Landing Page */}
      <div className="relative pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <nav className="relative flex items-center justify-between sm:h-10" aria-label="Global">
          <div className="flex items-center flex-grow flex-shrink-0 lg:flex-grow-0">
            <div className="flex items-center justify-between w-full md:w-auto">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">TA</div>
                <span className="text-xl font-bold text-teal-900">TEA Analytics</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block md:ml-10 md:pr-4 md:space-x-8">
            <button onClick={onLogin} className="font-medium text-gray-500 hover:text-gray-900">Entrar</button>
            <button onClick={onRegister} className="font-medium text-teal-600 hover:text-teal-500">Criar conta</button>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-slate-50 sm:pb-16 md:pb-20 w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Transforme relatórios em</span>{' '}
                  <span className="block text-teal-600 xl:inline">evolução visível.</span>
                </h1>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                  Uma plataforma inteligente (IA) para pais e terapeutas analisarem o progresso de crianças no espectro autista. Centralize documentos, gere gráficos e tenha insights clínicos em segundos.
                </p>
                <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                  <div className="rounded-md shadow">
                    <Button size="lg" onClick={onRegister} className="w-full">
                      Começar Agora
                    </Button>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Button variant="outline" size="lg" onClick={onLogin} className="w-full">
                      Já tenho conta
                    </Button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <p className="text-base text-teal-600 font-semibold tracking-wide uppercase">Funcionalidades</p>
            <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Tudo para acompanhar a jornada
            </h3>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-teal-500 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Linha do Tempo Evolutiva</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Transforme relatórios de texto em gráficos visuais de progresso nas áreas de comunicação, comportamento e autonomia.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-teal-500 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Assistente Clínico IA</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Tire dúvidas sobre os relatórios com um chat inteligente que entende o contexto histórico da criança.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Planos Flexíveis
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Escolha a opção ideal para suas necessidades.
            </p>
          </div>

          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-3 sm:gap-6 lg:max-w-7xl lg:mx-auto">
            {/* FREE PLAN */}
            <div className="border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-lg transition-shadow duration-300 flex flex-col">
              <div className="p-6 flex-1">
                <h2 className="text-lg leading-6 font-medium text-gray-900">Básico</h2>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">Grátis</span>
                  <span className="text-base font-medium text-gray-500">/sempre</span>
                </p>
                <p className="mt-5 text-sm text-gray-500">Ideal para começar a organizar.</p>
                <ul className="mt-6 space-y-4 mb-8">
                  <li className="flex space-x-3">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-sm text-gray-500">Até 3 relatórios mensais</span>
                  </li>
                  <li className="flex space-x-3">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-sm text-gray-500">Gráfico de Evolução Simples</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button onClick={onRegister} variant="outline" className="w-full">
                  Começar Grátis
                </Button>
              </div>
            </div>

            {/* PRO PLAN (MONTHLY) */}
            <div className="border border-teal-500 rounded-lg shadow-md bg-white relative hover:shadow-xl transition-shadow duration-300 flex flex-col transform scale-105 md:scale-100 lg:scale-105 z-10">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 px-3 py-1 bg-teal-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                Popular
              </div>
              <div className="p-6 flex-1">
                <h2 className="text-lg leading-6 font-medium text-gray-900">Profissional</h2>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">R$ 20</span>
                  <span className="text-base font-medium text-gray-500">/mês</span>
                </p>
                <p className="mt-5 text-sm text-gray-500">Flexibilidade total.</p>
                <ul className="mt-6 space-y-4 mb-8">
                  <li className="flex space-x-3">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-sm text-gray-500">Relatórios Ilimitados</span>
                  </li>
                  <li className="flex space-x-3">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-sm text-gray-500">Assistente IA Ilimitado</span>
                  </li>
                  <li className="flex space-x-3">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-sm text-gray-500">Suporte Prioritário</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button onClick={onRegister} variant="primary" className="w-full">
                  Assinar Mensal
                </Button>
              </div>
            </div>

            {/* ECONOMIC PLAN */}
            <div className="border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-lg transition-shadow duration-300 flex flex-col relative">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                Melhor Valor
              </div>
              <div className="p-6 flex-1">
                <h2 className="text-lg leading-6 font-medium text-gray-900">Econômico</h2>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">R$ 110</span>
                  <span className="text-base font-medium text-gray-500">/semestre</span>
                </p>
                <p className="mt-5 text-sm text-gray-500">Economize no longo prazo.</p>
                <ul className="mt-6 space-y-4 mb-8">
                  <li className="flex space-x-3">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-sm text-gray-500">Todos os benefícios Pro</span>
                  </li>
                  <li className="flex space-x-3">
                    <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-sm text-gray-500">Equivalente a R$ 18,33/mês</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button onClick={onRegister} variant="outline" className="w-full">
                  Assinar Econômico
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};