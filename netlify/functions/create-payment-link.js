const Razorpay = require('razorpay');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { phone, amount, description } = JSON.parse(event.body);
    
    // These keys are stored securely in Netlify, not in the code
    const KEY_ID = process.env.RAZORPAY_KEY_ID;
    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!KEY_ID || !KEY_SECRET) {
         return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API keys are not configured correctly.' }),
        };
    }

    const razorpay = new Razorpay({
        key_id: KEY_ID,
        key_secret: KEY_SECRET,
    });

    const options = {
        amount: amount * 100, // Amount in paise
        currency: "INR",
        accept_partial: false,
        description: description,
        customer: {
            contact: `+91${phone}`,
        },
        notify: {
            sms: true,
        },
        callback_url: "https://your-website.com/success", // Change this to your actual success page
        callback_method: "get"
    };

    try {
        const paymentLink = await razorpay.paymentLink.create(options);
        return {
            statusCode: 200,
            body: JSON.stringify({ short_url: paymentLink.short_url }),
        };
    } catch (error) {
        console.error("Razorpay Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create payment link.' }),
        };
    }
};