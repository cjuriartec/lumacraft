// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function handleCORS(_req?: Request) {
  return new Response("ok", { headers: corsHeaders });
}

Deno.serve(async (req) => {
  console.log("--- Document Exporter: Entry Point ---");
  console.log("Method:", req.method);

  if (req.method === "OPTIONS") {
    return await handleCORS(req);
  }

  try {
    const rawBody = await req.text();
    const { format, accountId, templateId, recordId, text } = JSON.parse(rawBody);

    if (!format || !accountId || !templateId || !recordId || !text) {
      return new Response(
        JSON.stringify({
          isError: true,
          error: `Missing required fields.`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (format === "pdf") {
      return new Response(
        JSON.stringify({
          isError: true,
          error: "PDF generation is not supported in the Edge Function. Use the Next.js API Route.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    console.log("Falling back to plain text export...");
    const fileBytes = new TextEncoder().encode(text || "");

    const extension = "txt";
    const mimeType = "text/plain";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileName = `${accountId}/${templateId}/${recordId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(fileName, fileBytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("exports")
      .createSignedUrl(fileName, 60 * 60);

    if (signedUrlError) {
      throw signedUrlError;
    }

    return new Response(JSON.stringify({ url: signedUrlData.signedUrl }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ isError: true, error: message }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
