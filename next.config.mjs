/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fichier de données lu sur le serveur : à embarquer dans le déploiement
  outputFileTracingIncludes: {
    "/": ["./data/vinyles.json"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
