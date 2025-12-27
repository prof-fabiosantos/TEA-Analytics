import Stripe from 'stripe';

// Inicializa o Stripe.
// Nota: No Vercel, as variáveis de ambiente são acessadas via process.env automaticamente.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const DOMAIN = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:5173';

const PLANS = {
  'pro': {
    priceId: process.env.STRIPE_PRICE_ID_PRO || 'price_1Hh1...REPLACE_WITH_REAL', 
    name: 'Plano Profissional'
  },
  'semester': {
    priceId: process.env.STRIPE_PRICE_ID_SEMESTER || 'price_1Hh2...REPLACE_WITH_REAL',
    name: 'Plano Econômico'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { planType, userEmail, userId } = req.body;
    
    const priceId = PLANS[planType]?.priceId;
    const planName = PLANS[planType]?.name || 'Assinatura TEA Analytics';

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          // Lógica híbrida: Se tiver ID real usa 'price', senão cria dados na hora (para teste)
          ...(priceId && !priceId.includes('REPLACE') 
            ? { price: priceId } 
            : {
              price_data: {
                currency: 'brl',
                product_data: {
                  name: planName,
                },
                unit_amount: planType === 'pro' ? 2000 : 11000, // 20.00 ou 110.00
              },
            }
          ),
          quantity: 1,
        },
      ],
      mode: 'payment', // Use 'subscription' se tiver configurado recorrência no Stripe
      success_url: `${DOMAIN}/?payment_success=true&plan=${planType}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/?canceled=true`,
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
    res.status(500).json({ error: error.message });
  }
}