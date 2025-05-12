import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export class OTPService {
  private static otpStore: Record<string, { otp: string; expiresAt: number }> =
    {};

  async sendOTP(mobile: string) {
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes

    // Store OTP in memory
    OTPService.otpStore[mobile] = { otp: otp.toString(), expiresAt };

    const res = await twilioClient.messages.create({
      body: `Your OTP is ${otp}`,
      to: mobile,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    });

    if (res?.sid) {
      console.log(`OTP sent to ${mobile}:`, otp);
      return otp;
    }
    return null;
  }

  async verifyOTP(mobile: string, otp: string) {
    const storedOtp = OTPService.otpStore[mobile];

    if (!storedOtp) {
      return { success: false, message: "OTP expired or invalid." };
    }

    if (Date.now() > storedOtp.expiresAt) {
      delete OTPService.otpStore[mobile]; // Remove expired OTP
      return { success: false, message: "OTP expired." };
    }

    if (storedOtp.otp !== otp) {
      return { success: false, message: "Invalid OTP." };
    }

    delete OTPService.otpStore[mobile]; // OTP is correct, remove it
    return { success: true, message: "OTP verified successfully." };
  }
}
