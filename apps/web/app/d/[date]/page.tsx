import { notFound } from "next/navigation";
import { getAllBundles, getIndex } from "@/lib/data";
import { MobileApp } from "@/app/components/mobile/MobileApp";

export async function generateStaticParams() {
  const idx = await getIndex();
  return idx.dates.map((date) => ({ date }));
}

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const [idx, bundles] = await Promise.all([getIndex(), getAllBundles()]);
  const bundle = bundles[date];
  if (!bundle) notFound();

  return (
    <MobileApp
      archive={idx.dates}
      bundles={bundles}
      initialDate={date}
      generatedAt={bundle.generatedAt}
    />
  );
}
