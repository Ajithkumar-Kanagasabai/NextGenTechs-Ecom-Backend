import { OTPService } from "../../../../../services/otp";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { GenerateTokenService } from "../../../../../services/generateToken";

type bodyProps = {
  mobile: string;
  otp: string;
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { mobile, otp } = req.body as bodyProps;
    if (!mobile) {
      return res.status(400).json({ error: "Mobile number is required" });
    }
    if (!otp) {
      return res.status(400).json({ error: "OTP is required" });
    }

    // Check if customer exists
    const customerModuleService = req.scope.resolve("customer");
    let customers = await customerModuleService.listCustomers({
      // @ts-ignore
      phone: mobile,
    });
    let customer = customers?.[0] || null;

    if (customer) {
      return res
        .status(400)
        .json({ error: "Customer with this mobile number already exists" });
    }

    // verify OTP
    const otpService = new OTPService();
    const result = await otpService.verifyOTP(mobile, otp);

    if (result.success) {
      // create customer
      customer = await customerModuleService.createCustomers({
        // @ts-ignore
        phone: mobile,
      });
      // Manually generate JWT token
      const generateTokenService = new GenerateTokenService();
      const authToken = generateTokenService.generateToken(customer?.id);
      res.json({ token: authToken, customer });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
};
