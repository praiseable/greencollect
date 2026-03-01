// Payment gateway integration (Razorpay)
// In development mode, payments are simulated

async function createPaymentOrder(amount, currency = 'PKR') {
  if (process.env.NODE_ENV === 'development') {
    return {
      id: 'dev_order_' + Date.now(),
      amount: amount * 100, // paisa
      currency,
      status: 'created',
    };
  }

  // Production: Use Razorpay
  // const Razorpay = require('razorpay');
  // const razorpay = new Razorpay({
  //   key_id: process.env.RAZORPAY_KEY_ID,
  //   key_secret: process.env.RAZORPAY_KEY_SECRET,
  // });
  // return razorpay.orders.create({ amount: amount * 100, currency });
}

async function verifyPayment(orderId, paymentId, signature) {
  if (process.env.NODE_ENV === 'development') {
    return { verified: true };
  }

  // Production: Verify Razorpay signature
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  //   .update(orderId + '|' + paymentId)
  //   .digest('hex');
  // return { verified: expectedSignature === signature };
}

module.exports = { createPaymentOrder, verifyPayment };
