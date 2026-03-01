export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function getPlaceDetails(placeId) {
  const fields = "name,formatted_phone_number,website,rating,user_ratings_total,formatted_address,editorial_summary";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

export async function POST(request) {
  const { city, trade } = await request.json();
  const query = `${trade.toLowerCase()} in ${city}`;

  try {
    // Step 1: Text search to get up to 15 places
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return Response.json({ contractors: [] });
    }

    // Step 2: Get details for each place (up to 15)
    const places = searchData.results.slice(0, 15);
    const detailsPromises = places.map(p => getPlaceDetails(p.place_id));
    const details = await Promise.all(detailsPromises);

    // Step 3: Format into contractor cards
    const contractors = details.map(d => {
      const rating = d.rating ? `⭐ ${d.rating}/5 (${d.user_ratings_total || 0} reviews)` : null;
      const summary = d.editorial_summary?.overview || null;
      const notes = [
        summary,
        rating,
        d.formatted_address ? `Located at ${d.formatted_address}.` : null,
      ].filter(Boolean).join(" ") || "Local contractor serving the area.";

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
