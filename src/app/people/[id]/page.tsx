import NetworkProfile from "@/components/network/NetworkProfile";
import { notFound } from "next/navigation";
import { networkUuid } from "@/lib/networkValidation";
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!networkUuid.test(id)) notFound();
  return <NetworkProfile id={id} />;
}
