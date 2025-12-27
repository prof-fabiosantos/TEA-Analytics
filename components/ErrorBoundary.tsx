import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado.</h2>
            <p className="text-gray-500 mb-6">
              Ocorreu um erro inesperado na aplicação. Nossos engenheiros já foram notificados (simulação).
            </p>
            <div className="bg-gray-100 p-3 rounded text-left text-xs font-mono text-red-800 mb-6 overflow-auto max-h-32">
              {this.state.error?.message}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset}>Recarregar Página</Button>
              <Button variant="outline" onClick={() => localStorage.clear()}>Limpar Dados Locais</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}