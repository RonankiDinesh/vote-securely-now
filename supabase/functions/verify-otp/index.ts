import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  userId: string;
  otp: string;
}

// Hash OTP for verification
async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, otp }: VerifyOtpRequest = await req.json();

    if (!userId || !otp) {
      return new Response(
        JSON.stringify({ error: "Missing userId or otp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Invalid OTP format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the latest unverified OTP request for this user
    const { data: otpRequest, error: fetchError } = await supabaseClient
      .from("otp_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRequest) {
      return new Response(
        JSON.stringify({ error: "No pending OTP request found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRequest.expires_at) < new Date()) {
      await supabaseClient.from("audit_logs").insert({
        event_type: "otp_failed",
        user_id: userId,
        details: { reason: "expired" },
      });

      return new Response(
        JSON.stringify({ error: "OTP has expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if max attempts exceeded
    if (otpRequest.attempts >= otpRequest.max_attempts) {
      await supabaseClient.from("audit_logs").insert({
        event_type: "otp_failed",
        user_id: userId,
        details: { reason: "max_attempts_exceeded" },
      });

      return new Response(
        JSON.stringify({ error: "Maximum attempts exceeded. Please request a new OTP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempts
    await supabaseClient
      .from("otp_requests")
      .update({ attempts: otpRequest.attempts + 1 })
      .eq("id", otpRequest.id);

    // Verify OTP hash
    const otpHash = await hashOtp(otp);
    
    if (otpHash !== otpRequest.otp_hash) {
      const remainingAttempts = otpRequest.max_attempts - otpRequest.attempts - 1;
      
      await supabaseClient.from("audit_logs").insert({
        event_type: "otp_failed",
        user_id: userId,
        details: { reason: "invalid_otp", remaining_attempts: remainingAttempts },
      });

      return new Response(
        JSON.stringify({ 
          error: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          remainingAttempts 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabaseClient
      .from("otp_requests")
      .update({ verified: true })
      .eq("id", otpRequest.id);

    // Update user profile as verified
    await supabaseClient
      .from("profiles")
      .update({ verified: true })
      .eq("id", userId);

    // Log successful verification
    await supabaseClient.from("audit_logs").insert({
      event_type: "otp_verified",
      user_id: userId,
      details: { channel: otpRequest.delivery_channel },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP verified successfully",
        verified: true
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-otp:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
