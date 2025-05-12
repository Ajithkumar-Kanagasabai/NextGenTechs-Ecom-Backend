import { OAuth2Client } from "google-auth-library";
import { GenerateTokenService } from "../../services/generateToken";
import passport from "passport";
import AppleStrategy from "passport-apple";
import jwt from "jsonwebtoken";

class GoogleAppleAuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Configure Apple Strategy
    passport.use(
      new AppleStrategy(
        {
          clientID: process.env.APPLE_CLIENT_ID!,
          teamID: process.env.APPLE_TEAM_ID!,
          keyID: process.env.APPLE_KEY_ID!,
          privateKeyString: process.env.APPLE_PRIVATE_KEY!.replace(
            /\\n/g,
            "\n"
          ),
          callbackURL: process.env.APPLE_CALLBACK_URL!,
          passReqToCallback: false,
        },
        async (
          accessToken: string,
          refreshToken: string,
          params: any, // this contains the raw id_token
          profile: any,
          done: Function
        ) => {
          try {
            const payload: any = jwt.decode(params.id_token);
            if (!payload) return done(new Error("Invalid Apple ID Token"));

            const email = payload.email;
            const name = payload.name || "";

            if (!email) {
              return done(new Error("Apple account must have an email"));
            }

            done(null, { email, name });
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }

  /**
   * Login Authenticates a user using a Google ID token.
   * @param {string} token - The Google ID token.
   * @returns {Promise<any>} - Returns user data or authentication error.
   */
  async loginWithGoogle(req: any, token: string): Promise<any> {
    const customerModuleService = req.scope.resolve("customer");

    try {
      // Verify Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) throw new Error("Invalid Google Token");

      const email = payload.email;
      const name = payload.name;

      if (!email) {
        throw new Error("Google account must have an email");
      }

      // Check if customer exists
      let customers = await customerModuleService.listCustomers({ email });
      let customer = customers?.[0] || null;

      if (!customer) {
        return null;
      }

      // Manually generate JWT token
      const generateTokenService = new GenerateTokenService();
      const authToken = generateTokenService.generateToken(customer?.id);

      return { customer, token: authToken };
    } catch (error) {
      throw new Error(`Google Authentication Failed: ${error.message}`);
    }
  }

  /**
   * Register Authenticates a user using a Google ID token.
   * @param {string} token - The Google ID token.
   * @returns {Promise<any>} - Returns user data or authentication error.
   */
  async registerWithGoogle(req: any, token: string): Promise<any> {
    const customerModuleService = req.scope.resolve("customer");

    try {
      // Verify Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) throw new Error("Invalid Google Token");

      const email = payload.email;
      const name = payload.name;

      if (!email) {
        throw new Error("Google account must have an email");
      }

      // Check if customer exists
      let customers = await customerModuleService.listCustomers({ email });
      let customer = customers?.[0] || null;
      if (customer) {
        return null;
      }

      // Create a new customer if it doesn't exist
      customer = await customerModuleService.createCustomers({
        first_name: name?.split(" ")[0] || "",
        last_name: name?.split(" ")[1] || "",
        email,
      });

      // Manually generate JWT token
      const generateTokenService = new GenerateTokenService();
      const authToken = generateTokenService.generateToken(customer?.id);

      return { customer, token: authToken };
    } catch (error) {
      throw new Error(`Google Authentication Failed: ${error.message}`);
    }
  }

  /**
   * Login with Apple
   */
  async loginWithApple(req: any, idToken: string) {
    const customerModuleService = req.scope.resolve("customer");

    try {
      const payload: any = jwt.decode(idToken);
      if (!payload) throw new Error("Invalid Apple Token");

      const email = payload.email;
      const name = payload.name;

      if (!email) {
        throw new Error("Apple account must have an email");
      }

      // Check if customer exists
      let customers = await customerModuleService.listCustomers({ email });
      let customer = customers?.[0] || null;

      if (!customer) {
        return null;
      }

      // Generate JWT token
      const generateTokenService = new GenerateTokenService();
      const authToken = generateTokenService.generateToken(customer?.id);

      return { customer, token: authToken };
    } catch (error) {
      throw new Error(`Apple Authentication Failed: ${error.message}`);
    }
  }

  /**
   * Register with Apple
   */
  async registerWithApple(req: any, idToken: string) {
    const customerModuleService = req.scope.resolve("customer");

    try {
      const payload: any = jwt.decode(idToken);
      if (!payload) throw new Error("Invalid Apple Token");

      const email = payload.email;
      const name = payload.name;

      if (!email) {
        throw new Error("Apple account must have an email");
      }

      // Check if customer exists
      let customers = await customerModuleService.listCustomers({ email });
      let customer = customers?.[0] || null;
      if (customer) {
        return null;
      }

      // Create a new customer if it doesn't exist
      customer = await customerModuleService.createCustomers({
        first_name: name?.split(" ")[0] || "",
        last_name: name?.split(" ")[1] || "",
        email,
      });

      // Generate JWT token
      const generateTokenService = new GenerateTokenService();
      const authToken = generateTokenService.generateToken(customer?.id);

      return { customer, token: authToken };
    } catch (error) {
      throw new Error(`Apple Authentication Failed: ${error.message}`);
    }
  }
}

export default GoogleAppleAuthService;
