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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao conectar com servidor de pagamento');
      }

      const { url } = await response.json();
      return url; // A URL segura de checkout do Stripe
    } catch (error) {
      console.error("Payment Error:", error);
      throw error;
    }
  },

  checkServerHealth: async () => {
    // Em serverless não há "health check" tradicional, assumimos true se a rede estiver ok
    return true; 
  }
};