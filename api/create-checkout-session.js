import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
      console.error("ERRO CRÍTICO: STRIPE_SECRET_KEY não definida.");
      return res.status(500).json({ 
        error: "Erro de configuração no servidor (Chave Stripe ausente)." 
      });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { planType, userEmail, userId } = req.body;

    // LÓGICA DE DOMÍNIO ROBUSTA PARA EVITAR LOGOUT
    // 1. Tenta usar CLIENT_URL fixo (Produção)
    // 2. Se não, usa o 'origin' da requisição (onde o usuário está agora)
    // 3. Se não, usa o 'referer'
    // 4. Fallback para VERCEL_URL ou localhost
    let domain = process.env.CLIENT_URL;
    
    if (!domain && req.headers.origin) {
        domain = req.headers.origin;
    } else if (!domain && req.headers.referer) {
        // Referer pode ter path, pegamos só a origem
        try {
            const url = new URL(req.headers.referer);
            domain = url.origin;
        } catch (e) {
            console.warn("Erro ao parsear referer:", e);
        }
    }

    if (!domain) {
      domain = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:5173';
    }
    
    // Remove slash final para padronizar
    domain = domain.replace(/\/$/, "");

    const PLANS = {
      'pro': {
        id: process.env.STRIPE_PRICE_ID_PRO, 
        name: 'Plano Profissional',
        amount: 2000
      },
      'semester': {
        id: process.env.STRIPE_PRICE_ID_SEMESTER,
        name: 'Plano Econômico',
        amount: 11000
      }
    };
    
    const selectedPlan = PLANS[planType];
    const configId = selectedPlan?.id || '';
    
    // LÓGICA DE CORREÇÃO INTELIGENTE (Preço vs Produto):
    let lineItem;

    if (configId.startsWith('price_')) {
        lineItem = { price: configId, quantity: 1 };
    } else {
        const productConfig = configId.startsWith('prod_') 
            ? { product: configId } 
            : { product_data: { name: selectedPlan.name } };

        lineItem = {
            price_data: {
                currency: 'brl',
                ...productConfig,
                unit_amount: selectedPlan.amount,
                recurring: {
                    interval: 'month',
                    interval_count: planType === 'semester' ? 6 : 1
                }
            },
            quantity: 1,
        };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'subscription',
      success_url: `${domain}/?payment_success=true&plan=${planType}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/?canceled=true`,
      customer_email: userEmail,
      metadata: { userId, planType }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe API Error:", error);
    res.status(500).json({ error: error.message || "Erro interno no pagamento" });
  }
}