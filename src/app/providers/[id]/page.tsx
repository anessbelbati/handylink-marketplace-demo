import ProviderProfileClient from "./provider-profile-client";

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProviderProfileClient userId={id} />;
}

