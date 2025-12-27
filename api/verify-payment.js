import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey) return res.status(500).json({ error: "Server Config Error: Missing Stripe Key" });
  if (!supabaseUrl || !supabaseServiceKey) {
      console.error("CRÍTICO: Faltando SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel/Server.");
      return res.status(500).json({ error: "Server Config Error: Missing Database Credentials" });
  }

  try {
    const stripe = new Stripe(stripeKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const planType = session.metadata?.planType || 'pro';
      const userId = session.metadata?.userId;
      const userEmail = session.customer_email || session.customer_details?.email;

      if (userId) {
        // 1. Tenta atualizar pelo ID
        let { error, data } = await supabaseAdmin
          .from('profiles')
          .update({ plan: planType })
          .eq('id', userId)
          .select();

        // 2. Fallback por Email se o ID não bater (ex: banco resetado)
        if ((!data || data.length === 0) && userEmail) {
            console.log(`Vercel: ID ${userId} não encontrado. Tentando update por email ${userEmail}`);
            const fallback = await supabaseAdmin
                .from('profiles')
                .update({ plan: planType })
                .eq('email', userEmail)
                .select();
            
            error = fallback.error;
        }

        if (error) {
           console.error("DB Update Failed:", error);
           return res.status(500).json({ error: "Database update failed" });
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
}