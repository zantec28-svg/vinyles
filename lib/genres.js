// Genres MusicBrainz / Discogs (anglais) -> un genre de la liste en français.

const GENRES = [
  ["Bande originale", /soundtrack|score|musical|stage & screen/],
  ["Chanson française", /chanson|french|variété/],
  ["Metal", /metal/],
  ["Hip-hop", /hip hop|hip-hop|rap|trap/],
  ["Reggae", /reggae|ska|dub|dancehall/],
  ["Jazz", /jazz|swing|bebop|bossa/],
  ["Blues", /blues/],
  ["Soul/Funk", /soul|funk|r&b|rhythm and blues|disco|gospel|motown/],
  ["Électro", /electro|house|techno|trance|ambient|synth|dance|downtempo|trip hop|edm|drum and bass/],
  ["Classique", /classical|baroque|opera|orchestral|symphon/],
  ["Folk", /folk|country|bluegrass|americana/],
  ["Pop", /pop/],
  ["Rock", /rock|punk|grunge|indie|alternative|new wave|psychedelic|shoegaze/],
];

// Genres MusicBrainz (anglais, avec nombre de votes) -> un genre de la liste.
export function genre(liste = []) {
  const tries = [...liste].sort((a, b) => (b.count || 0) - (a.count || 0));
  for (const g of tries) {
    const trouve = GENRES.find(([, re]) => re.test(g.name.toLowerCase()));
    if (trouve) return trouve[0];
  }
  return "";
}
