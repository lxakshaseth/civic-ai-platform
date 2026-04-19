import RouteRenderer from "@/src/app/RouteRenderer";

type PageProps = {
  params: Promise<{ slug: string[] }> | { slug: string[] };
};

export default async function PublicCatchAllPage({ params }: PageProps) {
  const resolvedParams = await params;

  return <RouteRenderer slug={["public", ...resolvedParams.slug]} />;
}
