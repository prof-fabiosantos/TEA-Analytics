// No Vercel (e Vite local com proxy), usamos caminhos relativos.
// A pasta /api é mapeada automaticamente para as Serverless Functions.
const API_BASE = '/api';

export const stripeService = {
  createCheckoutSession: async (planType: 'pro' | 'semester', userEmail: string, userId: string) => {
    try {
      const response = await fetch(`${API_BASE}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          userEmail,
          userId
        }),
      });

      if (!response.ok) {
        let errorMessage = `Erro HTTP: ${response.status} (${response.statusText})`;
        try {
            // Tenta ler o erro em JSON vindo da nossa API
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) {
            // Se falhar (ex: Vercel retornou HTML de 500 ou 404), mantém a mensagem HTTP
            console.error("Resposta da API não é JSON válido:", e);
        }
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      return url; // A URL segura de checkout do Stripe
    } catch (error) {
      console.error("Payment Error:", error);
      throw error;
    }
  },

  verifySession: async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Falha na verificação');
      }

      return await response.json();
    } catch (error) {
      console.error("Verification Error:", error);
      return { verified: false };
    }
  },

  checkServerHealth: async () => {
    // Em serverless não há "health check" tradicional, assumimos true se a rede estiver ok
    return true; 
  }
};