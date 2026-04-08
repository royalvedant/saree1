require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
// Update your CORS to allow your Netlify URL
const corsOptions = {
  origin: ["https://sareebyai.netlify.app", "http://localhost:8080"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholderID',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholderSecret',
});

// 1. Create an Order
app.post('/api/create-order', async (req, res) => {
  const { amount, planName } = req.body; // Amount should be in paise (e.g., 29900 for ₹299)
  
  const options = {
    amount: amount, 
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).send(error);
  }
});

// 2. Verify Payment (Crucial for security)
app.post('/api/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, creditsToAdd } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholderSecret')
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // PAYMENT SUCCESSFUL
    // Update your database here to add credits to the user
    console.log(`Successfully verified payment for User: ${userId}. Added ${creditsToAdd} credits.`);
    res.json({ status: "ok" });
  } else {
    res.status(400).json({ status: "verification_failed" });
  }
});

const PORT = process.env.PORT || 5001;

// Ensure you bind to 0.0.0.0 for Render
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend live on port ${PORT}`);
});
