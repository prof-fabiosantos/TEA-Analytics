import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Verificações de Segurança
  if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe Key missing in server config" });
  }
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Supabase credentials missing in server config" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Inicializa cliente Supabase com privilégios de Admin (Service Role)
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const planType = session.metadata?.planType || 'pro';
      const userId = session.metadata?.userId;

      if (userId) {
        // Atualiza o banco de dados diretamente
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan: planType })
          .eq('id', userId);

        if (error) {
           console.error("Failed to update profile DB:", error);
           return res.status(500).json({ error: "DB update failed" });
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