// URL do seu Backend (server.js)
// Em produção, altere para a URL do seu servidor hospedado (ex: Render, Vercel, Railway)
const API_URL = 'http://localhost:3000';

export const stripeService = {
  createCheckoutSession: async (planType: 'pro' | 'semester', userEmail: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/create-checkout-session`, {
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

  // Verifica se o servidor backend está online
  checkServerHealth: async () => {
    try {
      // Tenta um endpoint qualquer ou apenas um ping
      await fetch(API_URL, { method: 'HEAD' });
      return true;
    } catch (e) {
      return false;
    }
  }
};