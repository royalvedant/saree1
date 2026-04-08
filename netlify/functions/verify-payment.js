const crypto = require('crypto');

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, creditsToAdd } = JSON.parse(event.body);

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholderSecret')
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // PAYMENT SUCCESSFUL
      // Update your database here to add credits to the user
      console.log(`Successfully verified payment for User: ${userId}. Added ${creditsToAdd} credits.`);
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ok" })
      };
    } else {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "verification_failed" })
      };
    }
  } catch (error) {
    console.error("Verification Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Verification process failed" })
    };
  }
};
