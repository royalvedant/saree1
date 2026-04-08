const Razorpay = require('razorpay');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholderID',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholderSecret',
  });

  try {
    const { amount, planName } = JSON.parse(event.body);
    
    const options = {
      amount: amount, 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(order)
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Failed to create order', details: error.message }) 
    };
  }
};
