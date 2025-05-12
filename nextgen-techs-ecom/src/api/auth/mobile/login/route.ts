import { OTPService } from "../../../../services/otp";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type bodyProps = {
  mobile: string;
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const otpService = new OTPService();

    const { mobile } = req.body as bodyProps;
    if (!mobile) {
      return res.status(400).json({ error: "Mobile number is required" });
    }

    // Check if customer exists with this mobile
    const customerModuleService = req.scope.resolve("customer");
    let customers = await customerModuleService.listCustomers({
      // @ts-ignore
      phone: mobile,
    });
    let customer = customers?.[0] || null;
    if (!customer) {
      return res
        .status(400)
        .json({ error: "Customer with this mobile number not found" });
    }

    // send OTP
    const otp = await otpService.sendOTP(mobile);
    if (otp) {
      res.json({ success: true, message: "OTP sent successfully." });
    } else {
      return res
        .status(400)
        .json({ error: "Error sending OTP. Please try again." });
    }
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
};
