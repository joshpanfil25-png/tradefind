export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SEARCH_TERMS = {
  Plumbers: "plumber",
  Electricians: "electrician",
  "General Contractors": "general contractor",
};

async function getPlaceDetails(placeId) {
  const fields = "name,formatted_phone_number,website,rating,user_ratings_total,formatted_address,editorial_summary";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

async function searchPlaces(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

async function scrapeEmail(website) {
  if (!website || website === "N/A") return "N/A";
  try {
    const base = website.replace(/\/$/, "");
    const pagesToTry = [base, `${base}/contact`, `${base}/contact-us`, `${base}/about`];

    for (const pageUrl of pagesToTry) {
      try {
        const res = await fetch(pageUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(4000),
        });
        const html = await res.text();
        const emailMatch = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
        if (emailMatch) {
          // Filter out common false positives
          const filtered = emailMatch.filter(e =>
            !e.includes("sentry") &&
            !e.includes("example") &&
            !e.includes("wix") &&
            !e.includes("wordpress") &&
            !e.includes("schema") &&
            !e.includes(".png") &&
            !e.includes(".jpg")
          );
          if (filtered.length > 0) return filtered[0];
        }
      } catch {
        continue;
      }
    }
    return "N/A";
  } catch {
    return "N/A";
  }
}

export async function POST(request) {
  const { city, trade } = await request.json();
  const term = SEARCH_TERMS[trade] || trade.toLowerCase();

  try {
    let results = await searchPlaces(`${term} in ${city}`);

    if (results.length < 5) {
      const fallback = await searchPlaces(`construction contractor in ${city}`);
      const existingIds = new Set(results.map(r => r.place_id));
      results = [...results, ...fallback.filter(r => !existingIds.has(r.place_id))];
    }

    if (results.length === 0) return Response.json({ contractors: [] });

    const places = results.slice(0, 15);
    const details = await Promise.all(places.map(p => getPlaceDetails(p.place_id)));

    // Scrape emails in parallel
    const emails = await Promise.all(details.map(d => scrapeEmail(d.website)));

    const contractors = details.map((d, i) => {
      const rating = d.rating ? `⭐ ${d.rating}/5 (${d.user_ratings_total || 0} reviews)` : null;
      const summary = d.editorial_summary?.overview || null;
      const notes = [summary, rating, d.formatted_address ? `Located at ${d.formatted_address}.` : null]
        .filter(Boolean).join(" ") || "Local contractor serving the area.";

      return {
        name: d.name || "Unknown",
        phone: d.formatted_phone_number || "N/A",
        website: d.website || "N/A",
        email: emails[i] || "N/A",
        notes,
      };
    });

    return Response.json({ contractors });
  } catch (err) {
    console.error("Error:", err);
    return Response.json({ contractors: [], error: err.message });
  }
}
