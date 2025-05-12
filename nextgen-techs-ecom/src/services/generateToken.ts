import jwt from "jsonwebtoken";

export class GenerateTokenService {
  generateToken(customerId) {
    const SECRET = process.env.JWT_SECRET || "supersecret";

    return jwt.sign(
      {
        actor_id: customerId,
        actor_type: "customer",
        auth_identity_id: `authid_${customerId}`,
        app_metadata: {
          customer_id: customerId,
        },
      },
      SECRET,
      { expiresIn: "1h" }
    );
  }
}
