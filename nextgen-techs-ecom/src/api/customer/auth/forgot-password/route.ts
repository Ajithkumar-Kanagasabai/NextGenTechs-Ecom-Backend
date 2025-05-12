import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

type ForgotPasswordEmailType = {
  email: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email } = req.body as ForgotPasswordEmailType

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Resolve the customer service to check if email exists
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);
    
    // Check if a customer with this email exists
    const [customers, _] = await customerModuleService.listAndCountCustomers({ 
      email: email,
      has_account: true // Only check for registered customers
    });
    
    if (!customers.length) {
      return res.status(404).json({ error: "No customer found with this email" });
    }
    
    // If customer exists, proceed to send OTP
    const sendgridService = req.scope.resolve("sendgrid") as any;
    const result = await sendgridService.sendOTP(email);
    
    return res.json({
      success: result.success,
      message: "A password reset OTP has been sent to your email address. Please check your inbox.",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};