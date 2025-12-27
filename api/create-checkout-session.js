import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Verifica explicitamente se a chave existe antes de tentar inicializar
  if (!process.env.STRIPE_SECRET_KEY) {
      console.error("ERRO CRÍTICO: STRIPE_SECRET_KEY não definida nas variáveis de ambiente.");
      return res.status(500).json({ 
        error: "Configuração do servidor incompleta (Stripe Key ausente). Por favor, avise o administrador." 
      });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { planType, userEmail, userId } = req.body;

    // Determina a URL base. 
    // 1. Tenta usar CLIENT_URL definida nas env vars (Recomendado para Prod).
    // 2. Se não, usa VERCEL_URL (gerada automaticamente pelo Vercel), adicionando https://.
    // 3. Fallback para localhost.
    let domain = process.env.CLIENT_URL;
    if (!domain) {
      domain = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:5173';
    }
    
    // Remove slash final se existir para evitar duplicação na URL
    domain = domain.replace(/\/$/, "");

    const PLANS = {
      'pro': {
        priceId: process.env.STRIPE_PRICE_ID_PRO, 
        name: 'Plano Profissional'
      },
      'semester': {
        priceId: process.env.STRIPE_PRICE_ID_SEMESTER,
        name: 'Plano Econômico'
      }
    };
    
    const selectedPlan = PLANS[planType];
    const priceId = selectedPlan?.priceId;
    const planName = selectedPlan?.name || 'Assinatura TEA Analytics';

    // Validação básica
    if (!userEmail || !userId) {
       throw new Error("Dados do usuário incompletos.");
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          // Se tivermos um ID de preço real configurado no Vercel, usamos ele.
          // Caso contrário, criamos um preço dinâmico (útil se as chaves não estiverem configuradas ainda)
          ...(priceId && !priceId.includes('REPLACE') 
            ? { price: priceId } 
            : {
              price_data: {
                currency: 'brl',
                product_data: {
                  name: planName,
                },
                unit_amount: planType === 'pro' ? 2000 : 11000, // Fallback values
              },
            }
          ),
          quantity: 1,
        },
      ],
      mode: 'payment', 
      success_url: `${domain}/?payment_success=true&plan=${planType}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        planType: planType
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe API Error:", error);
    res.status(500).json({ error: error.message || "Erro interno ao criar sessão de pagamento" });
  }
}