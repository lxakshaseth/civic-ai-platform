import RouteRenderer from "@/src/app/RouteRenderer";

type PageProps = {
  params: Promise<{ slug: string[] }> | { slug: string[] };
};

export default async function CatchAllPage({ params }: PageProps) {
  const resolvedParams = await params;

  return <RouteRenderer slug={resolvedParams.slug} />;
}
