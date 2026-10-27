import { createOrderPayment, verifyOrderPayment, PayFor } from '../api/payment';

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayFailurePayload {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    source?: string;
    step?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      close: () => void;
      on: (event: 'payment.failed', handler: (payload: RazorpayFailurePayload) => void) => void;
    };
  }
}

export interface PaymentPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

const razorpayKey =
  import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_Reli2JwWcxfYe5';

const loadRazorpayScript = async (): Promise<boolean> => {
  if (window.Razorpay) {
    return true;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Opens Razorpay checkout for an order and verifies the payment with the backend.
 * payFor 'advance' charges the buyer's chosen advance; 'balance' charges whatever is still due.
 * Resolves 'paid' once verified, 'dismissed' if the buyer closes checkout,
 * and rejects with a readable Error if the payment or verification fails.
 */
export const payForOrder = async (
  orderId: string,
  payFor: PayFor,
  prefill?: PaymentPrefill
): Promise<'paid' | 'dismissed'> => {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded || !window.Razorpay) {
    throw new Error('Unable to load Razorpay checkout script');
  }
  const Razorpay = window.Razorpay;

  const { paymentOrder } = await createOrderPayment(orderId, payFor);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const options: RazorpayCheckoutOptions = {
      key: paymentOrder.keyId || razorpayKey,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      name: 'AgriFlow',
      description: `${payFor === 'advance' ? 'Advance payment' : 'Payment'} for Order #${orderId.substring(0, 8)}`,
      order_id: paymentOrder.id,
      handler: async (response: RazorpaySuccessResponse) => {
        try {
          await verifyOrderPayment(orderId, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          settle(() => resolve('paid'));
        } catch (verifyErr) {
          const message = verifyErr instanceof Error
            ? verifyErr.message
            : 'Payment verification failed';
          settle(() => reject(new Error(message)));
        }
      },
      prefill: {
        name: prefill?.name || '',
        email: prefill?.email || '',
        contact: prefill?.contact || ''
      },
      theme: {
        color: '#ca8a04'
      },
      modal: {
        ondismiss: () => settle(() => resolve('dismissed'))
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.on('payment.failed', (failurePayload: RazorpayFailurePayload) => {
      const failureError = failurePayload?.error;
      const message = failureError?.description
        || failureError?.reason
        || 'Payment failed at Razorpay checkout';

      console.error('[Razorpay payment.failed]', failurePayload);
      settle(() => reject(new Error(message)));
      razorpay.close();
    });
    razorpay.open();
  });
};
