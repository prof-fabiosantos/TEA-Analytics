import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Pergunta diretamente ao Stripe o status desta sessão
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Recupera o tipo de plano salvo nos metadados durante a criação da sessão
      const planType = session.metadata?.planType || 'pro';
      
      return res.status(200).json({ 
        verified: true, 
        plan: planType,
        customerEmail: session.customer_details?.email
      });
    } else {
      return res.status(200).json({ verified: false, status: session.payment_status });
    }

  } catch (error) {
    console.error("Stripe Verification Error:", error);
    res.status(500).json({ error: error.message });
  }
}