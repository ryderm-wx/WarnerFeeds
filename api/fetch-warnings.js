// /api/fetch-warnings.js
export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.weather.gov/alerts/active?area=MI');
    const data = await response.json();

    const warnings = data.features.filter(feature =>
      feature.properties.event === "Tornado Warning"
    );

    res.status(200).json(warnings);
  } catch (error) {
    console.error('Error fetching weather warnings:', error);
    res.status(500).json({ error: 'Failed to fetch warnings' });
  }
}
