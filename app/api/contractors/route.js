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

export async function POST(request) {
  const { city, trade } = await request.json();
  const term = SEARCH_TERMS[trade] || trade.toLowerCase();

  try {
    let results = await searchPlaces(`${term} in ${city}`);

    // Fallback if not enough results
    if (results.length < 5) {
      const fallback = await searchPlaces(`construction contractor in ${city}`);
      const existingIds = new Set(results.map(r => r.place_id));
      results = [...results, ...fallback.filter(r => !existingIds.has(r.place_id))];
    }

    if (results.length === 0) return Response.json({ contractors: [] });

    const places = results.slice(0, 15);
    const details = await Promise.all(places.map(p => getPlaceDetails(p.place_id)));

    const contractors = details.map(d => {
      const rating = d.rating ? `⭐ ${d.rating}/5 (${d.user_ratings_total || 0} reviews)` : null;
      const summary = d.editorial_summary?.overview || null;
      const notes = [summary, rating, d.formatted_address ? `Located at ${d.formatted_address}.` : null]
        .filter(Boolean).join(" ") || "Local contractor serving the area.";

      return {
        name: d.name || "Unknown",
        phone: d.formatted_phone_number || "N/A",
        website: d.website || "N/A",
        notes,
      };
    });

    return Response.json({ contractors });
  } catch (err) {
    console.error("Error:", err);
    return Response.json({ contractors: [], error: err.message });
  }
}
