import React, { useState } from 'react';
import { Button } from './Button';
import { User } from '../types';
import { stripeService } from '../services/stripeService';
import { useToast } from '../contexts/ToastContext';

interface PlansProps {
  currentUser: User;
  onSelectPlan: (plan: 'free' | 'pro' | 'semester') => void;
  onCancel: () => void;
}

export const Plans: React.FC<PlansProps> = ({ currentUser, onSelectPlan, onCancel }) => {
  const { addToast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<'pro' | 'semester' | null>(null);

  const handleSelectFree = () => {
    onSelectPlan('free');
  };

  const handleCheckout = async (plan: 'pro' | 'semester') => {
    setLoadingPlan(plan);
    try {
      // 1. Chama nosso Backend para criar a sessão no Stripe
      const checkoutUrl = await stripeService.createCheckoutSession(
        plan, 
        currentUser.email, 
        currentUser.id
      );

      // 2. Redireciona o usuário para a página segura do Stripe
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("URL de pagamento inválida");
      }
    } catch (error) {
      console.error(error);
      addToast("Erro ao iniciar pagamento. Verifique se o 'server.js' está rodando (npm run server).", "error");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Planos Profissionais
        </h2>
        <p className="mt-4 text-lg text-gray-500">
          Pagamento seguro processado pelo Stripe. Cancele quando quiser.
        </p>
      </div>

      <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-3 sm:gap-6 lg:max-w-7xl lg:mx-auto">
        {/* FREE PLAN */}
        <div className={`border rounded-lg shadow-sm divide-y divide-gray-200 bg-white flex flex-col ${currentUser.plan === 'free' ? 'ring-2 ring-teal-500' : ''}`}>
          <div className="p-6 flex-1">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Básico</h2>
            <p className="mt-4">
              <span className="text-4xl font-extrabold text-gray-900">Grátis</span>
              <span className="text-base font-medium text-gray-500">/sempre</span>
            </p>
            <p className="mt-5 text-sm text-gray-500">Para começar a organizar os documentos.</p>
            <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">Incluído</h3>
                <ul className="mt-4 space-y-4">
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
          </div>
          <div className="p-6 pt-0">
            <Button 
              className="w-full" 
              variant={currentUser.plan === 'free' ? 'outline' : 'primary'}
              disabled={currentUser.plan === 'free'}
              onClick={handleSelectFree}
            >
              {currentUser.plan === 'free' ? 'Plano Atual' : 'Selecionar Básico'}
            </Button>
          </div>
        </div>

        {/* PRO PLAN */}
        <div className={`border rounded-lg shadow-sm divide-y divide-gray-200 bg-white flex flex-col relative ${currentUser.plan === 'pro' ? 'ring-2 ring-teal-500' : ''}`}>
           <div className="absolute top-0 right-0 -mt-2 -mr-2 px-3 py-1 bg-teal-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                Popular
           </div>
          <div className="p-6 flex-1">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Profissional</h2>
            <p className="mt-4">
              <span className="text-4xl font-extrabold text-gray-900">R$ 20</span>
              <span className="text-base font-medium text-gray-500">/mês</span>
            </p>
            <p className="mt-5 text-sm text-gray-500">Flexibilidade e suporte total.</p>
            <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">Incluído</h3>
                <ul className="mt-4 space-y-4">
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
          </div>
          <div className="p-6 pt-0">
            <Button 
              className="w-full bg-[#635BFF] hover:bg-[#534be5]" // Stripe blurple brand color
              variant="primary"
              disabled={currentUser.plan === 'pro' || loadingPlan === 'pro'}
              onClick={() => handleCheckout('pro')}
            >
              {loadingPlan === 'pro' ? 'Carregando Stripe...' : currentUser.plan === 'pro' ? 'Plano Atual' : 'Pagar com Stripe'}
            </Button>
          </div>
        </div>

        {/* ECONOMIC PLAN */}
        <div className={`border rounded-lg shadow-sm divide-y divide-gray-200 bg-white flex flex-col relative ${currentUser.plan === 'semester' ? 'ring-2 ring-teal-500' : ''}`}>
           <div className="absolute top-0 right-0 -mt-2 -mr-2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                Melhor Valor
           </div>
          <div className="p-6 flex-1">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Econômico</h2>
            <p className="mt-4">
              <span className="text-4xl font-extrabold text-gray-900">R$ 110</span>
              <span className="text-base font-medium text-gray-500">/semestre</span>
            </p>
            <p className="mt-5 text-sm text-gray-500">Economia e tranquilidade.</p>
            <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">Incluído</h3>
                <ul className="mt-4 space-y-4">
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
          </div>
          <div className="p-6 pt-0">
            <Button 
              className="w-full bg-[#635BFF] hover:bg-[#534be5]"
              variant="primary"
              disabled={currentUser.plan === 'semester' || loadingPlan === 'semester'}
              onClick={() => handleCheckout('semester')}
            >
              {loadingPlan === 'semester' ? 'Carregando Stripe...' : currentUser.plan === 'semester' ? 'Plano Atual' : 'Pagar com Stripe'}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
         <Button variant="outline" onClick={onCancel}>Voltar para o App</Button>
      </div>
    </div>
  );
};