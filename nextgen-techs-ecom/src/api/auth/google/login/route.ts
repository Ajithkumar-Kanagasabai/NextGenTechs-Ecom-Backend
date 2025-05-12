import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import GoogleAuthService from "../../../../modules/auth/service";

type bodyProps = {
  token: string;
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { token } = req.body as bodyProps;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const googleAuthService: GoogleAuthService =
      req.scope.resolve("google-apple-auth");
    const result = await googleAuthService.loginWithGoogle(req, token);
    if (!result) {
      return res
        .status(400)
        .json({ error: "Customer with this email not found" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Error authenticating with Google:", err);
    res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
};
