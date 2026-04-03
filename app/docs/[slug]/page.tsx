import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsShell } from "@/app/components/docs-shell";
import { getAllDocs, getDocBySlug } from "@/lib/docs";

interface DocPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return getAllDocs().map((doc) => ({
    slug: doc.slug,
  }));
}

export async function generateMetadata({
  params,
}: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    return {};
  }

  return {
    title: `${doc.title} — Replay Docs`,
    description: doc.description,
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  return <DocsShell docs={getAllDocs()} doc={doc} />;
}
