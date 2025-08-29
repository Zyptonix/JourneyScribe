// app/api/send-email/route.js

import fetch from 'node-fetch';

// This is where you would store your actual API Key.
// In a Next.js app, for server-side code, you can access environment variables
// directly without NEXT_PUBLIC_ prefix.
const BREVO_API_KEY = process.env.BREVO_API_KEY; 
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@example.com'; // Your verified sender email
const SENDER_NAME = process.env.SENDER_NAME || 'Your App Name'; // Your sender name

export async function POST(request) {
    const { to, subject, htmlContent, textContent } = await request.json();

    if (!to || !subject || (!htmlContent && !textContent)) {
        return new Response(JSON.stringify({ error: 'Missing required email fields: to, subject, htmlContent/textContent' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!BREVO_API_KEY) {
        console.error("BREVO_API_KEY is not set. Email sending will fail.");
        return new Response(JSON.stringify({ error: 'Email service not configured. Please set BREVO_API_KEY.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // --- Brevo (formerly Sendinblue) API Call Example ---
        const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';
        
        const emailPayload = {
            sender: {
                email: SENDER_EMAIL,
                name: SENDER_NAME
            },
            to: [
                {
                    email: to
                }
            ],
            subject: subject,
            htmlContent: htmlContent, // Brevo prefers htmlContent for rich emails
            textContent: textContent // Fallback for plain text, optional
            // You can also add replyTo, headers, bcc, cc, attachments etc.
        };

        const response = await fetch(brevoApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': BREVO_API_KEY, // Brevo uses 'api-key' header
            },
            body: JSON.stringify(emailPayload),
        });

        if (response.ok) {
            console.log(`Email sent successfully to ${to} for subject: ${subject} via Brevo.`);
            return new Response(JSON.stringify({ success: true, message: 'Email sent successfully.' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            const errorData = await response.json();
            console.error(`Failed to send email to ${to} via Brevo:`, errorData);
            return new Response(JSON.stringify({ error: 'Failed to send email.', details: errorData }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error in /api/send-email (Brevo integration):', error);
        return new Response(JSON.stringify({ error: 'Internal server error while sending email.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
