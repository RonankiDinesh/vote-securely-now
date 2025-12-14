import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  userId: string;
  channel: "email" | "sms" | "both";
  email?: string;
  phone?: string;
}

interface SendResult {
  success: boolean;
  error?: string;
}

// Generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for storage
async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Send OTP via Email using SendGrid
async function sendEmailOtp(email: string, otp: string): Promise<SendResult> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL");

  if (!apiKey || !fromEmail) {
    console.error("SendGrid not configured - missing credentials");
    return { success: false, error: "Email service not configured" };
  }

  console.log("Sending email to:", email);

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail, name: "Voting System" },
        subject: "Your OTP Verification Code",
        content: [
          {
            type: "text/html",
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e3a5f;">Voting System - OTP Verification</h2>
                <p>Your one-time verification code is:</p>
                <div style="background: #f0f4f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">${otp}</span>
                </div>
                <p style="color: #666;">This code expires in 5 minutes.</p>
                <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
              </div>
            `,
          },
        ],
      }),
    });

    console.log("SendGrid response status:", response.status);
    
    if (response.status >= 200 && response.status < 300) {
      return { success: true };
    } else {
      const errorData = await response.text();
      console.error("SendGrid error:", errorData);
      return { success: false, error: "Email delivery failed" };
    }
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: "Email service error" };
  }
}

// Send OTP via SMS using Twilio
async function sendSmsOtp(phone: string, otp: string): Promise<SendResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio not configured - missing credentials");
    return { success: false, error: "SMS service not configured" };
  }

  // Ensure phone number is in E.164 format
  let formattedPhone = phone.trim();
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = "+" + formattedPhone;
  }

  console.log("Sending SMS to:", formattedPhone.substring(0, 5) + "****");

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: fromNumber,
          Body: `Your Voting System verification code is: ${otp}. This code expires in 5 minutes.`,
        }),
      }
    );

    const responseData = await response.json();
    console.log("Twilio response status:", response.status);
    
    if (response.status >= 200 && response.status < 300) {
      return { success: true };
    } else {
      console.error("Twilio error:", responseData);
      // Provide more helpful error messages
      if (responseData.code === 21608 || responseData.code === 21211) {
        return { success: false, error: "Phone number not verified. Use a verified number with Twilio trial." };
      }
      return { success: false, error: responseData.message || "SMS delivery failed" };
    }
  } catch (error) {
    console.error("SMS send error:", error);
    return { success: false, error: "SMS service error" };
  }
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

    const { userId, channel, email, phone }: SendOtpRequest = await req.json();

    if (!userId || !channel) {
      return new Response(
        JSON.stringify({ error: "Missing userId or channel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check recent OTP requests (max 5 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from("otp_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (count && count >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please wait before requesting another." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store OTP request
    const { error: insertError } = await supabaseClient.from("otp_requests").insert({
      user_id: userId,
      otp_hash: otpHash,
      expires_at: expiresAt,
      delivery_channel: channel,
      attempts: 0,
      max_attempts: 3,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create OTP request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send OTP based on channel
    let emailResult: SendResult = { success: false };
    let smsResult: SendResult = { success: false };
    const errors: string[] = [];

    if ((channel === "email" || channel === "both") && email) {
      emailResult = await sendEmailOtp(email, otp);
      if (!emailResult.success && emailResult.error) {
        errors.push(`Email: ${emailResult.error}`);
      }
    }

    if ((channel === "sms" || channel === "both") && phone) {
      smsResult = await sendSmsOtp(phone, otp);
      if (!smsResult.success && smsResult.error) {
        errors.push(`SMS: ${smsResult.error}`);
      }
    }

    // Log audit event
    await supabaseClient.from("audit_logs").insert({
      event_type: "otp_sent",
      user_id: userId,
      details: { channel, email_sent: emailResult.success, sms_sent: smsResult.success, errors },
    });

    if (!emailResult.success && !smsResult.success) {
      const errorMessage = errors.length > 0 
        ? `Failed to send OTP: ${errors.join("; ")}` 
        : "Failed to send OTP. Please check your contact details.";
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
        channels: { email: emailResult.success, sms: smsResult.success }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-otp:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
