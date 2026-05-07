import { api } from '../utils/api';

export interface CreateOrderPaymentResponse {
  success: boolean;
  message: string;
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

export const createOrderPayment = async (orderId: string): Promise<CreateOrderPaymentResponse> => {
  return api.post(`/orders/${orderId}/payment/create-order`, {});
};

export const verifyOrderPayment = async (
  orderId: string,
  payload: VerifyOrderPaymentPayload
): Promise<{ success: boolean; message: string }> => {
  return api.post(`/orders/${orderId}/payment/verify`, payload);
};
