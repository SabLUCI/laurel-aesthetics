// Client FAQ chatbot. Builds its knowledge from the live price list, hours and FAQ answers,
// so changes made in the app's Studio screens reach the bot straight away.
import Anthropic from "npm:@anthropic-ai/sdk@1.1.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const anthropic = new Anthropic(); // reads the ANTHROPIC_API_KEY secret
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Service = { name: string; cat: string; mins: number; price: number; providerId: string };
type Provider = { id: string; name: string; external: boolean };
type Faq = { q: string; a: string };

function hoursText(hours: (string[] | null)[]): string {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => `${DAYS[d]}: ${hours[d] ? hours[d]!.join("–") : "closed"}`).join("\n");
}

function buildSystem(pub: { settings: Record<string, any>; services: Service[]; providers: Provider[]; faq: Faq[] }): string {
  const s = pub.settings;
  const ext = new Set(pub.providers.filter((p) => p.external).map((p) => p.id));
  const line = (x: Service) => `- ${x.name}, ${x.mins} min, R${Math.round(x.price)}`;
  const own = pub.services.filter((x) => !ext.has(x.providerId));
  const nails = pub.services.filter((x) => ext.has(x.providerId));
  const cats = [...new Set(own.map((x) => x.cat))];
  const priceList = cats.map((c) => `${c}:\n${own.filter((x) => x.cat === c).map(line).join("\n")}`).join("\n");
  const externalNames = pub.providers.filter((p) => p.external).map((p) => p.name).join(", ");
  const faqs = pub.faq
    .filter((f) => !f.a.includes("{{"))
    .map((f) => `Q: ${f.q}\nA: ${f.a}`)
    .join("\n\n");
  const wa = s.whatsapp ? s.whatsapp : "the studio (the number is on the booking confirmation)";

  return `You are the friendly front-desk assistant for ${s.business}, a small beauty and skin studio at ${s.address}, South Africa. The studio's motto is "${s.tagline ?? "It's all about you"}".

Who you talk to: clients and potential clients on the studio's booking page, usually on their phones.

How to speak:
- Warm, calm and professional, like a good receptionist at a boutique spa.
- Short answers: 1 to 3 sentences, or a short list for prices.
- South African English, unless the client writes in Afrikaans; then answer in Afrikaans. Prices in rand, written like R650.
- Speak as "we" for the studio. Never pretend to be a person.

What you know (only use this, never guess):

Treatments and prices:
${priceList}

Opening hours:
${hoursText(s.hours)}

${nails.length ? `Nails are done in the same space by ${externalNames}, an independent nail technician. Her treatments:\n${nails.map(line).join("\n")}\n` : ""}
Studio answers to common questions:
${faqs}

What you do:
- Answer questions about treatments, prices, hours, location, preparation and aftercare.
- When someone wants to book, tell them to use the "Book a treatment" tab and say which treatment fits what they asked for.
- Suggest a treatment only from the list above, and explain the difference between two in plain words when asked.

What you never do:
- Never give medical advice or diagnose skin conditions. For rashes, infections, reactions, pregnancy questions beyond the notes above, or medication, say the therapist will advise in person and suggest a consultation.
- Never promise results, discounts or appointment times. Only the booking page and the studio confirm bookings.
- Never invent prices, products or treatments that are not listed.
- Never ask for ID numbers, card details or medical history in the chat.
- Don't discuss other businesses, competitors, or topics unrelated to the studio. Politely bring the chat back.

When you don't know:
Say so honestly and give the studio's WhatsApp number: ${wa}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let messages: Anthropic.MessageParam[];
  try {
    const body = await req.json();
    messages = (Array.isArray(body.messages) ? body.messages : []).slice(-12).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 1000),
    }));
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (!messages.length || messages[0].role !== "user" || messages[messages.length - 1].role !== "user") {
    return json({ error: "The conversation must start and end with a client message." }, 400);
  }

  const { data: pub, error } = await sb.rpc("public_studio");
  if (error) return json({ error: "Studio data unavailable" }, 500);

  try {
    const response = await anthropic.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [{ type: "text", text: buildSystem(pub), cache_control: { type: "ephemeral" } }],
      messages,
    } as any);

    if (response.stop_reason === "refusal") {
      return json({ reply: "Sorry, I can't help with that here. Please contact the studio directly." });
    }
    const reply = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();
    return json({ reply: reply || "Sorry, I didn't catch that. Could you ask again?" });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "Busy, try again shortly" }, 429);
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error", err.status, err.message);
      return json({ error: "Chat unavailable" }, 502);
    }
    console.error(err);
    return json({ error: "Chat unavailable" }, 500);
  }
});
