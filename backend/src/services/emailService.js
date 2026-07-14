const nodemailer = require('nodemailer')

/**
 * Email Service for transactional emails
 */
class EmailService {
  constructor () {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  /**
   * Send email
   */
  async sendEmail (to, subject, text, html = null) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@taxilibre.com',
        to,
        subject,
        text,
        html: html || this.generateHTMLTemplate(subject, text)
      }

      const info = await this.transporter.sendMail(mailOptions)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail (email, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
    const subject = 'Verify your TaxiLibre account'
    const text = `Please verify your email by clicking this link: ${verificationUrl}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify your TaxiLibre account</h2>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Verify Email</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    `

    return await this.sendEmail(email, subject, text, html)
  }

  /**
   * Send verification email
   */
  /**
   * Send password reset email
   */
  async sendPasswordReset (email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    const subject = 'Reset your TaxiLibre password'
    const text = `Please reset your password by clicking this link: ${resetUrl}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset your password</h2>
        <p>You requested a password reset for your TaxiLibre account.</p>
        <p>Please click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 10 minutes.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `

    return await this.sendEmail(email, subject, text, html)
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail (email, name) {
    const subject = 'Welcome to TaxiLibre!'
    const text = `Welcome ${name}! Thank you for joining TaxiLibre.`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to TaxiLibre!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for joining TaxiLibre! We're excited to have you on board.</p>
        <p>With TaxiLibre, you can:</p>
        <ul>
          <li>Book rides instantly</li>
          <li>Track your driver in real-time</li>
          <li>Pay securely with multiple options</li>
          <li>Rate your experience</li>
        </ul>
        <p>Download our app or visit our website to get started!</p>
        <p style="color: #999;">The TaxiLibre Team</p>
      </div>
    `

    return await this.sendEmail(email, subject, text, html)
  }

  /**
   * Generate basic HTML template
   */
  generateHTMLTemplate (subject, text) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${subject}</h2>
        <p style="color: #666; line-height: 1.6;">${text}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated email from TaxiLibre.</p>
      </div>
    `
  }
}

module.exports = new EmailService()
