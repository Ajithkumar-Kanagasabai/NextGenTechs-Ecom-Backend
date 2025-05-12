
import sgMail from "@sendgrid/mail"
import crypto from "crypto"

type OTPStoreType = {
  [email: string]: {
    otp: string
    expiresAt: number
  }
}

// Simple in-memory store (replace with DB or Redis for production)
const otpStore: OTPStoreType = {}

class SendgridService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  }

  async sendOTP(email: string): Promise<{ success: boolean }> {
    const otp = this.generateOTP()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 mins

    otpStore[email] = { otp, expiresAt }

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: "Password Reset Request - OTP Verification",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
      html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`,
    }

    await sgMail.send(msg)
    return { success: true }
  }

  async verifyOTP(email: string, inputOtp: string): Promise<boolean> {
    const record = otpStore[email]
    if (!record) return false

    const { otp, expiresAt } = record
    if (Date.now() > expiresAt) {
      delete otpStore[email]
      return false
    }

    if (otp === inputOtp) {
      delete otpStore[email]
      return true
    }

    return false
  }

  private generateOTP(): string {
    return crypto.randomInt(1000, 9999).toString()
  }
}

export const service = SendgridService
