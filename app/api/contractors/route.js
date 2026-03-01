import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const { city, trade } = await request.json();
  const label = trade === "Carpenters" ? "carpenters/general contractors" : trade.toLowerCase();

  const prompt = `Search the web and find exactly 15 ${label} based in or near ${city}. For each provide name, phone (or "N/A"), website domain (or "N/A"), and a 2-sentence cliff notes summary covering specialties, reputation, and any notable info.

Return ONLY valid JSON — no markdown, no backticks:
{"contractors":[{"name":"...","phone":"...","website":"...","notes":"..."}]}

Exactly 15 entries required.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (response.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return Response.json({ contractors: [] }, { status: 200 });

  const parsed = JSON.parse(match[0]);
  return Response.json({ contractors: parsed.contractors || [] });
}
