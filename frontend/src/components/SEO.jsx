import { Helmet } from 'react-helmet-async';

const SITE = 'SmartAtithi';
const DOMAIN = 'https://www.smartaithi.com';
const DEFAULT_DESC = 'Book restaurants and hotels in Malegaon, Shirdi, Mumbai, Nashik and across India. Instant table reservations and room bookings online.';
const DEFAULT_KW = 'hotel booking, restaurant booking, table reservation, room booking, SmartAtithi, Malegaon hotel, Shirdi hotel, Mumbai restaurant, Nashik restaurant, online booking India';

export default function SEO({ title, description, keywords, image, path = '', type = 'website', schema }) {
  const fullTitle = title ? `${title} | ${SITE}` : `${SITE} — Restaurant & Hotel Booking in India`;
  const url = `${DOMAIN}${path}`;
  const img = image || `${DOMAIN}/og-image.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || DEFAULT_DESC} />
      <meta name="keywords" content={keywords || DEFAULT_KW} />
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow" />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || DEFAULT_DESC} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || DEFAULT_DESC} />
      <meta name="twitter:image" content={img} />

      {/* JSON-LD Structured Data */}
      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
}
