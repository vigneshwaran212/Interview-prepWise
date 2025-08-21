import Vapi from "@vapi-ai/web";

// Debug: Check if VAPI token is available
if (!process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN) {
  console.error("❌ VAPI Web Token is missing. Please set NEXT_PUBLIC_VAPI_WEB_TOKEN in your environment variables.");
}

export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);