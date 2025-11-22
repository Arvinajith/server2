/**
 * Password reset routes
 * Handles forget password and reset password endpoints
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const emailService = require('../services/emailService');

/**
 * POST /api/password-reset/forgot-password
 * Request password reset - sends email with OTP
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!user) {
            // For security, don't reveal if user exists or not
            return res.status(404).json({ 
                success: false, 
                message: 'If an account with that email exists, a password reset OTP has been sent.' 
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Set OTP expiry (10 minutes from now)
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

        // Save OTP to database
        user.resetOTP = otp;
        user.resetOTPExpiry = otpExpiry;
        await user.save();

        // Send email with OTP
        try {
            await emailService.sendPasswordResetOTP(user.email, otp);
            
            res.status(200).json({ 
                success: true, 
                message: 'Password reset OTP has been sent to your email address.' 
            });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            // Clear OTP if email fails
            user.resetOTP = null;
            user.resetOTPExpiry = null;
            await user.save();
            
            res.status(500).json({ 
                success: false, 
                message: 'Failed to send email. Please try again later.' 
            });
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again later.' 
        });
    }
});

/**
 * POST /api/password-reset/verify-otp
 * Verify OTP for password reset
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate input
        if (!email || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and OTP are required' 
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid email address.' 
            });
        }

        // Check if OTP exists
        if (!user.resetOTP) {
            return res.status(400).json({ 
                success: false, 
                message: 'No OTP found. Please request a new password reset.' 
            });
        }

        // Check if OTP matches
        if (user.resetOTP !== otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid OTP. Please check and try again.' 
            });
        }

        // Check if OTP has expired
        if (user.resetOTPExpiry < new Date()) {
            // Clear expired OTP
            user.resetOTP = null;
            user.resetOTPExpiry = null;
            await user.save();
            
            return res.status(400).json({ 
                success: false, 
                message: 'OTP has expired. Please request a new password reset.' 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'OTP verified successfully' 
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again later.' 
        });
    }
});

/**
 * POST /api/password-reset/reset-password
 * Reset password with OTP verification
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Validate input
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, OTP, and new password are required' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid email address.' 
            });
        }

        // Check if OTP exists
        if (!user.resetOTP) {
            return res.status(400).json({ 
                success: false, 
                message: 'No OTP found. Please request a new password reset.' 
            });
        }

        // Check if OTP matches
        if (user.resetOTP !== otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid OTP. Please check and try again.' 
            });
        }

        // Check if OTP has expired
        if (user.resetOTPExpiry < new Date()) {
            // Clear expired OTP
            user.resetOTP = null;
            user.resetOTPExpiry = null;
            await user.save();
            
            return res.status(400).json({ 
                success: false, 
                message: 'OTP has expired. Please request a new password reset.' 
            });
        }

        // Update password (will be hashed by pre-save hook)
        user.password = newPassword;
        
        // Clear OTP and expiry
        user.resetOTP = null;
        user.resetOTPExpiry = null;
        
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: 'Password has been reset successfully.' 
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again later.' 
        });
    }
});

module.exports = router;

