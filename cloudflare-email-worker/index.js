export default {
  async email(message, env, ctx) {
    try {
      const webhookUrl = env.WEBHOOK_URL;
      const sharedSecret = env.INBOUND_SHARED_SECRET;

      if (!webhookUrl) {
        console.error('WEBHOOK_URL not configured');
        return new Response('Configuration error', { status: 500 });
      }

      const rawEmail = await new Response(message.raw).text();

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-Inbound-Secret': sharedSecret || '',
        },
        body: rawEmail,
      });

      if (!response.ok) {
        console.error('Webhook delivery failed:', response.status, await response.text());
        return new Response('Webhook delivery failed', { status: 500 });
      }

      console.log(`Email forwarded successfully from ${message.from} to ${message.to}`);
      return new Response('Email processed', { status: 200 });

    } catch (error) {
      console.error('Error processing email:', error);
      return new Response('Processing error: ' + error.message, { status: 500 });
    }
  }
};
