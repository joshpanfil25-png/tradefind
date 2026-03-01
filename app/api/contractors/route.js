import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function POST(request) {
  const { city, trade } = await request.json();
  const label = trade === "Carpenters" ? "carpenters/general contractors" : trade.toLowerCase();

  const prompt = `Search the web and find exactly 15 ${label} based in or near ${city}. For each provide name, phone (or "N/A"), website domain (or "N/A"), and a 2-sentence cliff notes summary covering specialties, reputation, and any notable info.

Return ONLY valid JSON — no markdown, no backticks:
{"contractors":[{"name":"...","phone":"...","website":"...","notes":"..."}]}

Exactly 15 entries required.`;

  const messages = [{ role: "user", content: prompt }];
  const tools = [{ type: "web_search_20250305", name: "web_search" }];

  let response;
  // Agentic loop — keep going until Claude gives a final text response
  for (let i = 0; i < 10; i++) {
    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      tools,
      messages,
    });

    // If Claude is done, break
    if (response.stop_reason === "end_turn") break;

    // If Claude used a tool, feed the results back in
    if (response.stop_reason === "tool_use") {
      const assistantMsg = { role: "assistant", content: response.content };
      const toolResults = response.content
        .filter(b => b.type === "tool_use")
        .map(b => ({
          type: "tool_result",
          tool_use_id: b.id,
          content: b.content || "No results",
        }));
      messages.push(assistantMsg);
      messages.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  const raw = (response.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return Response.json({ contractors: [] });

  const parsed = JSON.parse(match[0]);
  return Response.json({ contractors: parsed.contractors || [] });
}
