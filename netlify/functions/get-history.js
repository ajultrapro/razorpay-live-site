// ADD THIS BLOCK AT THE VERY TOP OF BOTH .js FUNCTION FILES

exports.handler = async (event) => {
    const submittedPassword = (event.headers.authorization || '').replace('Bearer ', '');
    const correctPassword = process.env.PAGE_PASSWORD;

    if (!submittedPassword || submittedPassword !== correctPassword) {
        return {
            statusCode: 401, // Unauthorized
            body: JSON.stringify({ error: 'Unauthorized' }),
        };
    }

    // ... your existing function code continues below ...
const Razorpay = require('razorpay');
const { google } = require('googleapis');

// Helper function to initialize clients (re-used logic)
async function initClients() {
    // Google Sheets
    const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii'));
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // Razorpay
    const KEY_ID = process.env.RAZORPAY_KEY_ID;
    const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    const razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });

    return { sheets, razorpay };
}

exports.handler = async () => {
    try {
        const { sheets, razorpay } = await initClients();
        const spreadsheetId = '1llz_1isFNXUXLZB0bleOfBV0mMYEgGqH0EIcHX9sYro'; // ⚠️ Replace with your Sheet ID

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:G',
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) { // Only headers or empty
            return { statusCode: 200, body: JSON.stringify([]) };
        }

        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            let entry = {};
            headers.forEach((header, index) => {
                entry[header] = row[index];
            });
            return entry;
        });

        // --- NEW: Fetch latest status for each link ---
        // This can be slow if you have many links!
        const promises = data.map(async (entry) => {
            if (entry.ID && entry.Status === 'created') {
                try {
                    const latestLinkData = await razorpay.paymentLink.fetch(entry.ID);
                    entry.Status = latestLinkData.status; // Update status
                } catch (fetchError) {
                    console.error(`Failed to fetch status for ${entry.ID}:`, fetchError);
                }
            }
            return entry;
        });

        const updatedData = await Promise.all(promises);
        
        // Reverse the array to show the most recent first
        return {
            statusCode: 200,
            body: JSON.stringify(updatedData.reverse()),
        };

    } catch (error) {
        console.error("Error getting history:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to retrieve history.' }),
        };
    }

};
