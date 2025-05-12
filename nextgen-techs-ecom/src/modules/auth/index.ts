import GoogleAppleAuthService from "./service"
import { Module } from "@medusajs/framework/utils";

export const GOOGLE_APPLE_AUTH_MODULE = "google-apple-auth";
export default Module(GOOGLE_APPLE_AUTH_MODULE, {
  service: GoogleAppleAuthService,
});
