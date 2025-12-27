import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// INSTRUÇÕES DE CONFIGURAÇÃO:
// 1. Crie um arquivo .env na raiz
// 2. Adicione: STRIPE_SECRET_KEY=sk_test_... (Sua chave secreta do Stripe)
// 3. Adicione: CLIENT_URL=http://localhost:5173
// 4. Rode: node server.js

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_change_me');

app.use(cors());
app.use(express.json());

const DOMAIN = process.env.CLIENT_URL || 'http://localhost:5173';

// Mapa de Preços (Em produção, viria do banco ou env vars)
// Você deve criar produtos no Dashboard do Stripe e pegar os IDs (ex: price_12345)
const PLANS = {
  'pro': {
    priceId: 'price_1Hh1...REPLACE_WITH_REAL_STRIPE_PRICE_ID_FOR_PRO', 
    name: 'Plano Profissional'
  },
  'semester': {
    priceId: 'price_1Hh2...REPLACE_WITH_REAL_STRIPE_PRICE_ID_FOR_SEMESTER',
    name: 'Plano Econômico'
  }
};

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planType, userEmail, userId } = req.body;
    
    // Fallback para testes se o usuário não configurou os IDs reais ainda
    // O Stripe Mock permite testar o fluxo UI mesmo sem produto real configurado
    const priceId = PLANS[planType]?.priceId;

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          // Se tiver um priceId real, use 'price'. Senão, usa 'price_data' para criar na hora (apenas para teste)
          ...(priceId && !priceId.includes('REPLACE') 
            ? { price: priceId } 
            : {
              price_data: {
                currency: 'brl',
                product_data: {
                  name: PLANS[planType]?.name || 'Assinatura TEA Analytics',
                },
                unit_amount: planType === 'pro' ? 2000 : 11000, // em centavos (20.00 ou 110.00)
              },
            }
          ),
          quantity: 1,
        },
      ],
      mode: 'payment', // Use 'subscription' se for recorrente real
      success_url: `${DOMAIN}/?payment_success=true&plan=${planType}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        planType: planType
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para verificar o status do pagamento (opcional, para segurança extra no frontend)
app.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({ status: session.payment_status, metadata: session.metadata });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify session" });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));