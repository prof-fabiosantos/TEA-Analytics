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
    let domain = process.env.CLIENT_URL;
    if (!domain) {
      domain = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:5173';
    }
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
    const rawPriceId = selectedPlan?.priceId;
    const planName = selectedPlan?.name || 'Assinatura TEA Analytics';

    // CORREÇÃO DE ERRO COMUM:
    // O usuário muitas vezes copia o "Product ID" (prod_...) em vez do "Price ID" (price_...).
    // O Stripe falha se passarmos um ID de produto onde ele espera um preço.
    // Se o ID não começar com 'price_', ignoramos e usamos a criação dinâmica de preço (fallback).
    const useExplicitPrice = rawPriceId && rawPriceId.startsWith('price_');

    // Validação básica
    if (!userEmail || !userId) {
       throw new Error("Dados do usuário incompletos.");
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        useExplicitPrice
          ? { 
              price: rawPriceId, 
              quantity: 1 
            }
          : {
              // Fallback: Se não houver ID de preço válido, configuramos manualmente
              price_data: {
                currency: 'brl',
                product_data: {
                  name: planName,
                  description: planType === 'semester' ? 'Cobrança semestral' : 'Cobrança mensal'
                },
                unit_amount: planType === 'pro' ? 2000 : 11000, 
                recurring: {
                  interval: 'month',
                  interval_count: planType === 'semester' ? 6 : 1
                }
              },
              quantity: 1,
            }
      ],
      mode: 'subscription', // Mudado para subscription para garantir recorrência
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