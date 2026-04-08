// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * document-exporter — Supabase Edge Function
 *
 * Handles non-PDF document export formats (txt, docx fallback).
 * PDF generation is handled entirely in the Next.js API Route via
 * @react-pdf/renderer (see /api/collections/[id]/records/[recordId]/export).
 *
 * Supported formats: "txt" (plain text), "docx" (plain text with .docx ext, future use).
 */

async function handleCORS(_req: Request) {
  return new Response("ok", { headers: corsHeaders });
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return await handleCORS(req);
  }

  try {
    const { format, title, accountId } = await req.json();

    if (!format || !accountId) {
      return new Response(
        JSON.stringify({
          isError: true,
          error: `Missing required fields. Format: ${!!format}, AccountId: ${!!accountId}`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (format === "pdf") {
      // PDF is now handled server-side in the Next.js API Route.
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

    // Plain text fallback (txt / docx as txt)
    const encoder = new TextEncoder();
    const fileBytes = encoder.encode(title ?? "export");
    const extension = format === "docx" ? "docx" : "txt";
    const mimeType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "text/plain";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `${accountId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(fileName, fileBytes, {
        contentType: mimeType,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("exports")
      .createSignedUrl(fileName, 60 * 60); // 1 hr

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
