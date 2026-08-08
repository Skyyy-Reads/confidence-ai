// Supabase Edge Function: generate-questions
//
// Turns pasted notes/topic (+ optional photos) into multiple-choice quiz
// questions. Requires a logged-in Supabase user — the anon key alone is not
// enough, so this can't be called by a logged-out visitor even if they hit
// the endpoint directly (e.g. from dev tools).
//
// Env vars required (set with `supabase secrets set`):
//   ANTHROPIC_API_KEY   - your Anthropic API key
//   SUPABASE_URL        - auto-provided by Supabase at runtime
//   SUPABASE_ANON_KEY   - auto-provided by Supabase at runtime

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ---- 1. Require a real, logged-in user ----
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token || token === SUPABASE_ANON_KEY) {
    return json({ error: "Login required to generate questions." }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ error: "Login required to generate questions." }, 401);
  }

  // ---- 2. Validate input ----
  let body: { source?: string; count?: number; images?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const source = (body.source || "").toString().slice(0, 20000);
  const count = Math.min(Math.max(parseInt(String(body.count ?? 6), 10) || 6, 1), 12);
  const images = Array.isArray(body.images) ? body.images.slice(0, 6) : [];

  if (!source && images.length === 0) {
    return json({ error: "Provide notes, a topic, or at least one image." }, 400);
  }

  // ---- 3. Build the model request ----
  const content: Record<string, unknown>[] = [
    { type: "text", text: buildPrompt(source, count) },
  ];
  for (const dataUrl of images) {
    const match = /^data:(.*);base64,(.*)$/.exec(dataUrl);
    if (!match) continue;
    const [, mediaType, base64] = match;
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64 },
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        messages: [{ role: "user", content }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return json({ error: "Question generation failed upstream." }, 502);
    }

    const data = await res.json();
    const text = (data.content || [])
      .map((block: { text?: string }) => block.text || "")
      .join("");

    const cleaned = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Model did not return a question array.");
    }

    return json({ questions });
  } catch (e) {
    console.error("generate-questions error:", e);
    return json({ error: "Something went wrong generating questions." }, 500);
  }
});

function buildPrompt(source: string, count: number) {
  return [
    `Generate exactly ${count} multiple-choice questions testing understanding of the material below.`,
    `Respond with ONLY a JSON array (no markdown fences, no commentary) of objects shaped like:`,
    `{"question": string, "options": [string, string, string, string], "correctIndex": number (0-3), "explanation": string}`,
    ``,
    `Material:`,
    source || "(see attached image(s) of notes)",
  ].join("\n");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
