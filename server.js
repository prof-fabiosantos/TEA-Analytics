import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Inicializa Supabase Admin
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

app.use(cors());
app.use(express.json());

const DOMAIN = process.env.CLIENT_URL || 'http://localhost:5173';

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

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planType, userEmail, userId } = req.body;
    
    const selectedPlan = PLANS[planType];
    const configId = selectedPlan?.id || '';

    // LÓGICA DE CORREÇÃO INTELIGENTE:
    let lineItem;

    if (configId.startsWith('price_')) {
        // Caso Ideal: ID de Preço
        lineItem = { price: configId, quantity: 1 };
    } else {
        // Fallback: ID de Produto (prod_) ou nada
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
      success_url: `${DOMAIN}/?payment_success=true&plan=${planType}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/?canceled=true`,
      customer_email: userEmail,
      metadata: { userId, planType }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
});

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