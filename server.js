import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();

// --- CONFIGURAÇÃO E VERIFICAÇÃO DE CHAVES ---
const stripeKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeKey || stripeKey.includes('placeholder')) {
  console.warn("⚠️ AVISO: STRIPE_SECRET_KEY não configurada. Pagamentos falharão.");
}

if (!supabaseServiceKey || supabaseServiceKey.includes('placeholder')) {
  console.error("❌ ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY faltando no .env. O backend não conseguirá atualizar o plano do usuário.");
}

const stripe = new Stripe(stripeKey || 'sk_test_placeholder');

// Inicializa Supabase Admin (Bypassa RLS)
const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder'
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
      const userEmail = session.customer_email || session.customer_details?.email;

      console.log(`Verificando pagamento para UserID: ${userId} (Email: ${userEmail}) - Plano: ${planType}`);

      if (userId) {
        // 1. Tenta atualizar pelo ID
        let { error, count } = await supabaseAdmin
          .from('profiles')
          .update({ plan: planType })
          .eq('id', userId)
          .select('id'); // Select para retornar count

        // 2. Fallback: Se não achou pelo ID (banco recriado), tenta pelo Email
        if ((!count && userEmail) || error) {
            console.warn(`⚠️ Usuário não encontrado pelo ID ${userId}. Tentando fallback pelo email ${userEmail}...`);
            const fallbackResult = await supabaseAdmin
                .from('profiles')
                .update({ plan: planType })
                .eq('email', userEmail)
                .select('id');
            
            error = fallbackResult.error;
        }

        if (error) {
           console.error("❌ Erro ao atualizar DB:", error);
           return res.status(500).json({ error: "Falha ao salvar no banco de dados. Contate suporte." });
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
app.listen(PORT, () => console.log(`🚀 Servidor backend rodando em http://localhost:${PORT}`));