import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { generateResetPasswordTokenWorkflow } from "@medusajs/medusa/core-flows";

type VerifyOTPType = {
  email: string;
  otp: string;
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, otp } = req.body as VerifyOTPType;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    // Resolve the sendgrid service with proper typing
    const sendgridService = req.scope.resolve("sendgrid") as any;

    // Verify OTP
    const isValid = await sendgridService.verifyOTP(email, otp);
    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    // Generate password reset token using the workflow
    const { result } = await generateResetPasswordTokenWorkflow(req.scope).run({
      input: {
        entityId: email,
        actorType: "customer",
        provider: "emailpass",
        secret: process.env.JWT_SECRET || "supersecret",
      },
    });

    if (!result) {
      return res.status(400).json({ error: "Reset password token Failed" });
    }

    return res.json({
      success: true,
      message: "OTP verified successfully and password reset token generated",
      token: result,
    });
  } catch (error) {
    console.error("Error in OTP verification or token generation:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
};
