import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const { city, trade } = await request.json();
  const label = trade === "Carpenters" ? "carpenters/general contractors" : trade.toLowerCase();

  const prompt = `Search the web and find exactly 15 ${label} based in or near ${city}. For each provide: name, phone (or "N/A"), website (or "N/A"), and a 2-sentence summary of their specialties and reputation.

Respond ONLY with valid JSON, no markdown, no explanation:
{"contractors":[{"name":"...","phone":"...","website":"...","notes":"..."}]}`;

  try {
    const messages = [{ role: "user", content: prompt }];
    let finalText = "";

    for (let i = 0; i < 8; i++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages,
      });

      // Collect any text from this response
      const textBlocks = response.content.filter(b => b.type === "text");
      if (textBlocks.length > 0) {
        finalText = textBlocks.map(b => b.text).join("");
      }

      // If done, break
      if (response.stop_reason === "end_turn") break;

      // If tool use, feed results back
      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(b => b.type === "tool_use");
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: toolUseBlocks.map(b => ({
            type: "tool_result",
            tool_use_id: b.id,
            content: typeof b.content === "string" ? b.content : JSON.stringify(b.content || ""),
          })),
        });
      } else {
        break;
      }
    }

    const match = finalText.match(/\{[\s\S]*\}/);
    if (!match) return Response.json({ contractors: [] });

    const parsed = JSON.parse(match[0]);
    return Response.json({ contractors: parsed.contractors || [] });

  } catch (err) {
    console.error("Error:", err);
    return Response.json({ contractors: [], error: err.message });
  }
}
