const Razorpay = require('razorpay');
const { google } = require('googleapis');

// Helper function to initialize Google Sheets client
async function initSheetsClient() {
    const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii'));
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { phone, amount, description } = JSON.parse(event.body);
    const KEY_ID = process.env.RAZORPAY_KEY_ID;
    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    const razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });

    const options = {
        amount: amount * 100,
        currency: "INR",
        description: description,
        customer: { contact: `+91${phone}` },
        notify: { sms: true },
        callback_url: "https://your-website.com/success",
        callback_method: "get"
    };

    try {
        const paymentLink = await razorpay.paymentLink.create(options);

        // --- NEW: Save record to Google Sheets ---
        try {
            const sheets = await initSheetsClient();
            const spreadsheetId = '1llz_1isFNXUXLZB0bleOfBV0mMYEgGqH0EIcHX9sYro'; // ⚠️ Replace with your Sheet ID
            
            const newRow = [
                new Date().toISOString(),
                paymentLink.id,
                paymentLink.short_url,
                phone,
                amount,
                description,
                paymentLink.status // Will be 'created'
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Sheet1!A:G',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [newRow],
                },
            });

        } catch (sheetsError) {
            console.error("Error writing to Google Sheets:", sheetsError);
            // Don't fail the whole request, just log the error
        }
        // --- End of new code ---

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
