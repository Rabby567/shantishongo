import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, secretKey } = await req.json();
    
    console.log("Creating admin account for:", email);

    // Simple secret key check
    if (secretKey !== "CREATE_FIRST_ADMIN_2024") {
      console.log("Invalid secret key provided");
      return new Response(JSON.stringify({ error: "Invalid secret key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    console.log("Connecting to Supabase...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create the user using admin API
    console.log("Creating user...");
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    console.log("User created with ID:", userId);

    // Create profile manually since trigger might not fire with admin API
    console.log("Creating profile...");
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, email, full_name: fullName });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // Assign admin role
    console.log("Assigning admin role...");
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      console.error("Role error:", roleError);
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Admin account created successfully!");
    return new Response(
      JSON.stringify({ success: true, message: "Admin account created successfully", userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
