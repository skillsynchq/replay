import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  navTitle: string;
  order: number;
}

export interface DocHeading {
  id: string;
  title: string;
  depth: 2 | 3;
}

export interface DocPage extends DocMeta {
  content: string;
  headings: DocHeading[];
}

const DOCS_DIR = path.join(process.cwd(), "content", "docs");

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[`"'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripMarkdown(value: string) {
  return value
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function parseFrontmatter(source: string) {
  if (!source.startsWith("---\n")) {
    return { data: {}, content: source };
  }

  const endIndex = source.indexOf("\n---\n");
  if (endIndex === -1) {
    return { data: {}, content: source };
  }

  const rawFrontmatter = source.slice(4, endIndex);
  const content = source.slice(endIndex + 5);
  const data: Record<string, string | number> = {};

  for (const line of rawFrontmatter.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const unquoted = rawValue.replace(/^['"]|['"]$/g, "");
    data[key] = /^\d+$/.test(unquoted) ? Number(unquoted) : unquoted;
  }

  return { data, content };
}

function extractHeadings(content: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const matches = content.matchAll(/^(##|###)\s+(.+)$/gm);

  for (const match of matches) {
    const depth = match[1] === "##" ? 2 : 3;
    const title = stripMarkdown(match[2]);
    headings.push({
      id: slugify(title),
      title,
      depth,
    });
  }

  return headings;
}

function parseDocFile(filename: string): DocPage {
  const slug = filename.replace(/\.mdx$/, "");
  const raw = readFileSync(path.join(DOCS_DIR, filename), "utf8");
  const { data, content } = parseFrontmatter(raw);

  const title = typeof data.title === "string" ? data.title : slug;
  const description =
    typeof data.description === "string" ? data.description : "";
  const navTitle =
    typeof data.navTitle === "string" ? data.navTitle : title;
  const order = typeof data.order === "number" ? data.order : 999;

  return {
    slug,
    title,
    description,
    navTitle,
    order,
    content: content.trim(),
    headings: extractHeadings(content),
  };
}

export function getAllDocs(): DocMeta[] {
  return readdirSync(DOCS_DIR)
    .filter((filename) => filename.endsWith(".mdx"))
    .map(parseDocFile)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      navTitle: doc.navTitle,
      order: doc.order,
    }));
}

export function getDocBySlug(slug: string): DocPage | null {
  const filename = `${slug}.mdx`;
  const files = new Set(readdirSync(DOCS_DIR));

  if (!files.has(filename)) {
    return null;
  }

  return parseDocFile(filename);
}
