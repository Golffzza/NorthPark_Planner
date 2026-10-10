import { redirect } from "next/navigation";

type TripDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;
  redirect(`/trips/${encodeURIComponent(id)}/result`);
}