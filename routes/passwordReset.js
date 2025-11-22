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
 * Request password reset - sends email with reset link
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
                message: 'If an account with that email exists, a password reset link has been sent.' 
            });
        }

        // Generate random reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Set token expiry (1 hour from now)
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

        // Save token to database
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        // Send email with reset link
        try {
            await emailService.sendPasswordResetEmail(user.email, resetUrl);
            
            res.status(200).json({ 
                success: true, 
                message: 'Password reset link has been sent to your email address.' 
            });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            // Clear token if email fails
            user.resetToken = null;
            user.resetTokenExpiry = null;
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
 * GET /api/password-reset/verify-token/:token
 * Verify if reset token is valid
 */
router.get('/verify-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ 
                success: false, 
                message: 'Reset token is required' 
            });
        }

        // Find user with matching token
        const user = await User.findOne({ resetToken: token });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid or expired reset token.' 
            });
        }

        // Check if token has expired
        if (user.resetTokenExpiry < new Date()) {
            // Clear expired token
            user.resetToken = null;
            user.resetTokenExpiry = null;
            await user.save();
            
            return res.status(400).json({ 
                success: false, 
                message: 'Reset token has expired. Please request a new password reset.' 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Token is valid' 
        });

    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred. Please try again later.' 
        });
    }
});

/**
 * POST /api/password-reset/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Validate input
        if (!token || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token and new password are required' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Find user with matching token
        const user = await User.findOne({ resetToken: token });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid or expired reset token.' 
            });
        }

        // Check if token has expired
        if (user.resetTokenExpiry < new Date()) {
            // Clear expired token
            user.resetToken = null;
            user.resetTokenExpiry = null;
            await user.save();
            
            return res.status(400).json({ 
                success: false, 
                message: 'Reset token has expired. Please request a new password reset.' 
            });
        }

        // Update password (will be hashed by pre-save hook)
        user.password = newPassword;
        
        // Clear reset token and expiry
        user.resetToken = null;
        user.resetTokenExpiry = null;
        
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

