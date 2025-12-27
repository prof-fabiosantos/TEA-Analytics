import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// INSTRUÇÕES DE CONFIGURAÇÃO:
// 1. Crie um arquivo .env na raiz
// 2. Adicione: STRIPE_SECRET_KEY=sk_test_...
// 3. Adicione: SUPABASE_SERVICE_ROLE_KEY=... (Para atualizar o plano do usuário)
// 4. Adicione: VITE_SUPABASE_URL=...
// 5. Rode: node server.js

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Inicializa Supabase Admin para atualizar o banco de dados ignorando RLS
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

app.use(cors());
app.use(express.json());

const DOMAIN = process.env.CLIENT_URL || 'http://localhost:5173';

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

// Rota 1: Criar Sessão de Checkout
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planType, userEmail, userId } = req.body;
    
    const priceId = PLANS[planType]?.priceId;
    const planName = PLANS[planType]?.name || 'Assinatura TEA Analytics';

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          ...(priceId && !priceId.includes('REPLACE') 
            ? { price: priceId } 
            : {
              price_data: {
                currency: 'brl',
                product_data: {
                  name: planName,
                },
                unit_amount: planType === 'pro' ? 2000 : 11000, 
              },
            }
          ),
          quantity: 1,
        },
      ],
      mode: 'payment', 
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

// Rota 2: Verificar Pagamento e Atualizar Banco
app.post('/verify-payment', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const planType = session.metadata?.planType || 'pro';
      const userId = session.metadata?.userId;

      if (userId) {
        console.log(`Atualizando usuário ${userId} para plano ${planType}...`);
        
        // Atualiza o banco de dados via Supabase Admin
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan: planType })
          .eq('id', userId);

        if (error) {
           console.error("Erro ao atualizar DB:", error);
           return res.status(500).json({ error: "Falha ao atualizar plano no banco de dados" });
        }
      }
      
      return res.status(200).json({ 
        verified: true, 
        plan: planType 
      });
    } else {
      return res.status(200).json({ verified: false, status: session.payment_status });
    }

  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor de Pagamentos rodando em http://localhost:${PORT}`));