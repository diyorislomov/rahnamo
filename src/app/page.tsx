import NetworkFeed from "@/components/network/NetworkFeed";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { post } = await searchParams;
  return <NetworkFeed postId={typeof post === "string" ? post : undefined} />;
}
