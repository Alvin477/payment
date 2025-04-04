import crypto from 'crypto';

export class CallbackService {
  private maxRetries = 3;
  private timeout = 8000; // 8 seconds timeout to stay under Vercel's limit

  async sendPaymentCallback(payment: any, status: string, receivedAmount: number) {
    let retryCount = 0;
    let lastError;

    while (retryCount < this.maxRetries) {
      try {
        if (!payment.callbackUrl) {
          console.log('No callback URL specified');
          return;
        }

        const payload = {
          orderId: payment.orderId,
          status,
          amount: payment.amount,
          receivedAmount,
          address: payment.address,
          timestamp: new Date().toISOString()
        };

        const signature = crypto
          .createHmac('sha256', process.env.ADMIN_API_KEY || '')
          .update(JSON.stringify(payload))
          .digest('hex');

        console.log('Sending callback to:', payment.callbackUrl);
        console.log('Callback payload:', payload);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(payment.callbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Signature': signature
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Callback failed with status ${response.status}`);
          }

          console.log('Callback sent successfully');
          return true;
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Callback request timed out');
          }
          throw error;
        }
      } catch (error) {
        lastError = error;
        retryCount++;
        
        console.error(`Callback attempt ${retryCount} failed:`, error);
        
        if (retryCount < this.maxRetries) {
          // Shorter delays for Vercel: 1s, 2s, 4s
          const delay = Math.min(Math.pow(2, retryCount - 1) * 1000, 4000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('All callback attempts failed:', lastError);
    return false;
  }
} 