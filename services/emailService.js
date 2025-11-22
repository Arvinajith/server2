/**
 * Email service for sending password reset emails
 * Uses nodemailer to send emails
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create transporter
// For development, you can use Gmail or other SMTP services
// For production, use a proper email service like SendGrid, AWS SES, etc.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
    }
});

/**
 * Send password reset OTP email
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 */
const sendPasswordResetOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from: `"Password Reset" <${process.env.EMAIL_USER || 'noreply@example.com'}>`,
            to: email,
            subject: 'Password Reset OTP',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background: linear-gradient(135deg, #ff8, #ffa500);
                            padding: 20px;
                            text-align: center;
                            border-radius: 10px 10px 0 0;
                        }
                        .content {
                            background: white;
                            padding: 30px;
                            border-radius: 0 0 10px 10px;
                        }
                        .otp-box {
                            background: linear-gradient(135deg, #ff8, #ffa500);
                            color: #333;
                            font-size: 32px;
                            font-weight: bold;
                            text-align: center;
                            padding: 20px;
                            border-radius: 10px;
                            letter-spacing: 8px;
                            margin: 30px 0;
                            font-family: 'Courier New', monospace;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            color: #666;
                            font-size: 12px;
                        }
                        .warning {
                            background-color: #fff3cd;
                            border: 1px solid #ffc107;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                            color: #856404;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2 style="color: #333; margin: 0;">Password Reset OTP</h2>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>You have requested to reset your password. Please use the following OTP (One-Time Password) to verify your identity:</p>
                            
                            <div class="otp-box">
                                ${otp}
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Important:</strong> This OTP will expire in 10 minutes. Do not share this code with anyone.
                            </div>
                            
                            <p>Enter this OTP on the password reset page to proceed with resetting your password.</p>
                            
                            <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message, please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};

module.exports = {
    sendPasswordResetOTP
};

