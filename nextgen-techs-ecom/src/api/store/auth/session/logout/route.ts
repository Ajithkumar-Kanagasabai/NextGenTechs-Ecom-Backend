import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  // For cookie-based session
  res.clearCookie("connect.sid", {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  })
  
  // Destroy the session if needed
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err)
      }
    })
  }
  

  
  res.status(200).json({
    success: true,
    message: "Session and Cookie cleared. If using JWT authentication, please clear the token from client storage."
  })
}