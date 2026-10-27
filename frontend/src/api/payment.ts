import { api } from '../utils/api';

export type PayFor = 'advance' | 'balance';

export interface CreateOrderPaymentResponse {
  success: boolean;
  message: string;
  amount: number;
  payFor: PayFor;
  paymentOrder: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    keyId?: string;
  };
}

export interface VerifyOrderPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const createOrderPayment = async (
  orderId: string,
  payFor: PayFor = 'balance'
): Promise<CreateOrderPaymentResponse> => {
  return api.post(`/orders/${orderId}/payment/create-order`, { payFor });
};

export const verifyOrderPayment = async (
  orderId: string,
  payload: VerifyOrderPaymentPayload
): Promise<{ success: boolean; message: string }> => {
  return api.post(`/orders/${orderId}/payment/verify`, payload);
};
