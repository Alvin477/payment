import crypto from 'crypto';

export class CallbackService {
  private maxRetries = 3;

  async sendPaymentCallback(payment: any, status: string, receivedAmount: number) {
    let retryCount = 0;
    let lastError;

    while (retryCount < this.maxRetries) {
      try {
        if (!payment.callbackUrl) {
          console.log('No callback URL specified');
          return;
        }

        // Match exactly what Laravel expects
        const payload = {
          orderId: payment.orderId,
          status: status,
          amount: Number(payment.amount),
          receivedAmount: Number(receivedAmount),
          address: payment.address,
          timestamp: new Date().toISOString()
        };

        // Generate signature exactly as Laravel verifies it
        const payloadString = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', process.env.ADMIN_API_KEY || '')
          .update(payloadString)
          .digest('hex');

        console.log('Sending callback to:', payment.callbackUrl);
        console.log('Callback payload:', payload);

        const response = await fetch(payment.callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Signature': signature
          },
          body: payloadString
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Callback failed with status ${response.status}: ${errorText}`);
        }

        console.log('Callback sent successfully');
        return true;
      } catch (error) {
        lastError = error;
        retryCount++;
        
        console.error(`Callback attempt ${retryCount} failed:`, error);
        
        if (retryCount < this.maxRetries) {
          const delay = Math.pow(2, retryCount - 1) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('All callback attempts failed:', lastError);
    return false;
  }
} 