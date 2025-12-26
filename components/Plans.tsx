import React, { useState } from 'react';
import { Button } from './Button';
import { User } from '../types';

interface PlansProps {
  currentUser: User;
  onSelectPlan: (plan: 'free' | 'pro' | 'semester') => void;
  onCancel: () => void;
}

export const Plans: React.FC<PlansProps> = ({ currentUser, onSelectPlan, onCancel }) => {
  const [pendingPlan, setPendingPlan] = useState<'pro' | 'semester' | null>(null);

  const handleSelect = (plan: 'free' | 'pro' | 'semester') => {
    if (plan === 'free') {
      onSelectPlan('free');
    } else {
      setPendingPlan(plan);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText('fsantos.mail@gmail.com');
    alert('Chave PIX copiada!');
  };

  const getPlanDetails = (plan: 'pro' | 'semester') => {
    if (plan === 'pro') return { name: 'Profissional (Mensal)', price: '20,00' };
    return { name: 'Econômico (Semestral)', price: '110,00' };
  };

  const handleSendProof = () => {
    if (!pendingPlan) return;
    const details = getPlanDetails(pendingPlan);
    const message = `Olá! Realizei o pagamento via PIX para o plano ${details.name} no valor de R$ ${details.price}. Segue o comprovante para liberação do acesso (Ref: ${currentUser.email})`;
    const whatsappUrl = `https://wa.me/92981551933?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleConfirmPayment = () => {
    if (pendingPlan) {
      onSelectPlan(pendingPlan);
    }
  };

  if (pendingPlan) {
    const details = getPlanDetails(pendingPlan);
    // URL para gerar QR Code dinâmico com a chave PIX
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=fsantos.mail@gmail.com`;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-teal-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              Pagamento via PIX
            </h2>
          </div>
          
          <div className="p-8">
            <div className="text-center mb-8">
              <p className="text-gray-500 text-sm uppercase tracking-wide">Você escolheu o plano</p>
              <h3 className="text-2xl font-bold text-gray-900">{details.name}</h3>
              <p className="text-4xl font-extrabold text-teal-600 mt-2">R$ {details.price}</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-gray-300 flex flex-col items-center mb-8">
              <div className="w-48 h-48 bg-white p-2 rounded-lg border border-gray-200 mb-4 flex items-center justify-center">
                 <img 
                   src={qrCodeUrl} 
                   alt="QR Code PIX" 
                   className="w-full h-full object-contain"
                 />
              </div>
              
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-500 mb-1 text-center">Chave PIX (Email)</label>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value="fsantos.mail@gmail.com" 
                    className="flex-1 bg-white border border-gray-300 text-gray-700 text-center rounded-lg px-3 py-2 focus:outline-none"
                  />
                  <button onClick={handleCopyPix} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center mb-4">
                Após realizar o pagamento, envie o comprovante pelo WhatsApp para liberarmos seu acesso imediatamente.
              </p>
              
              <Button onClick={handleSendProof} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                Enviar Comprovante no WhatsApp
              </Button>
              
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                <Button onClick={handleConfirmPayment} variant="outline" className="w-full text-teal-700 border-teal-200 hover:bg-teal-50">
                  Já enviei o comprovante (Liberar Acesso)
                </Button>
                <button 
                  onClick={() => setPendingPlan(null)} 
                  className="text-sm text-gray-400 hover:text-gray-600 py-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Planos que crescem com você
        </h2>
        <p className="mt-4 text-lg text-gray-500">
          Escolha a melhor opção para acompanhar o desenvolvimento.
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
              onClick={() => handleSelect('free')}
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
              className="w-full" 
              variant={currentUser.plan === 'pro' ? 'outline' : 'primary'}
              disabled={currentUser.plan === 'pro'}
              onClick={() => handleSelect('pro')}
            >
              {currentUser.plan === 'pro' ? 'Plano Atual' : 'Assinar Mensal'}
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
              className="w-full" 
              variant={currentUser.plan === 'semester' ? 'outline' : 'primary'}
              disabled={currentUser.plan === 'semester'}
              onClick={() => handleSelect('semester')}
            >
              {currentUser.plan === 'semester' ? 'Plano Atual' : 'Assinar Econômico'}
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