package org.assistant.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    private final JavaMailSender mailSender;
    
    @Value("${app.email.from:noreply@omniassistant.com}")
    private String fromEmail;
    
    @Value("${app.email.enabled:false}")
    private boolean emailEnabled;
    
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }
    
    public void sendPasswordResetEmail(String toEmail, String userName, String resetLink) {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would send password reset email to: {}", toEmail);
            logger.info("Reset link: {}", resetLink);
            return;
        }
        
        try {
            String subject = "Password Reset - Omni Assistant";
            String body = createPasswordResetEmailBody(userName, resetLink);
            
            sendHtmlEmail(toEmail, subject, body);
            logger.info("Password reset email sent successfully to: {}", toEmail);
            
        } catch (Exception e) {
            logger.error("Failed to send password reset email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }
    
    public void sendWelcomeEmail(String toEmail, String userName) {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would send welcome email to: {}", toEmail);
            return;
        }
        
        try {
            String subject = "Welcome to Omni Assistant";
            String body = createWelcomeEmailBody(userName);
            
            sendHtmlEmail(toEmail, subject, body);
            logger.info("Welcome email sent successfully to: {}", toEmail);
            
        } catch (Exception e) {
            logger.error("Failed to send welcome email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send welcome email", e);
        }
    }
    
    private void sendEmail(String toEmail, String subject, String body) {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would send email to: {}", toEmail);
            return;
        }
        
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setFrom(fromEmail);
        message.setSubject(subject);
        message.setText(body);
        
        mailSender.send(message);
    }
    
    private void sendHtmlEmail(String toEmail, String subject, String body) throws MessagingException {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would send HTML email to: {}", toEmail);
            return;
        }
        
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setTo(toEmail);
        helper.setFrom(fromEmail);
        helper.setSubject(subject);
        helper.setText(body, true); // true indicates HTML
        
        mailSender.send(message);
    }
    
    private String createPasswordResetEmailBody(String userName, String resetLink) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Password Reset</h1>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <p>We received a request to reset your password for your Omni Assistant account.</p>
                        <p>Click the button below to reset your password:</p>
                        <p style="text-align: center;">
                            <a href="%s" class="button">Reset Password</a>
                        </p>
                        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #667eea;">%s</p>
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>This link will expire in 24 hours</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>For security, never share this link with anyone</li>
                        </ul>
                        <p>If you have any questions, please contact our support team.</p>
                    </div>
                    <div class="footer">
                        <p>This email was sent from Omni Assistant</p>
                        <p>© 2024 Omni Assistant. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """, userName, resetLink, resetLink);
    }
    
    private String createWelcomeEmailBody(String userName) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Omni Assistant</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #667eea; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to Omni Assistant!</h1>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <p>Welcome to Omni Assistant! We're excited to have you on board.</p>
                        
                        <h3>What you can do with Omni Assistant:</h3>
                        
                        <div class="feature">
                            <strong>🤖 AI-Powered Chat</strong><br>
                            Chat with advanced AI models including OpenAI GPT-4o-mini and DeepSeek for intelligent assistance.
                        </div>
                        
                        <div class="feature">
                            <strong>📋 Task Management</strong><br>
                            Create, organize, and track tasks with priorities, due dates, and hierarchical structures.
                        </div>
                        
                        <div class="feature">
                            <strong>⚡ Function Calling</strong><br>
                            Let AI perform actions like creating tasks and retrieving information automatically.
                        </div>
                        
                        <div class="feature">
                            <strong>🔐 Secure & Private</strong><br>
                            Your data is protected with enterprise-grade security and privacy controls.
                        </div>
                        
                        <p>Ready to get started? Log in to your account and explore all the features!</p>
                        
                        <p>If you have any questions or need help, feel free to reach out to our support team.</p>
                        
                        <p>Best regards,<br>The Omni Assistant Team</p>
                    </div>
                    <div class="footer">
                        <p>This email was sent from Omni Assistant</p>
                        <p>© 2024 Omni Assistant. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """, userName);
    }
}