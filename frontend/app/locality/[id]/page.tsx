import LocalityClient from './LocalityClient';

// Hardcoded RGV locality IDs seeded into Aurora (MVP: 3 cities)
const LOCALITY_IDS = [
  '06252ca8-e5ad-4037-8068-b5b6d1097c55', // Edinburg
  'fb553439-a5b8-437a-9f8f-f8e56ff47843', // McAllen
  '210f6afb-eaf1-48e5-ab8a-38c624a6fb47', // Mission
];

export function generateStaticParams() {
  return LOCALITY_IDS.map((id) => ({ id }));
}

export default async function LocalityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LocalityClient id={id} />;
}
