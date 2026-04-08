import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { config } from "@/lib/db/schema";

const TTL = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, { value: unknown; expiresAt: number }>();

function cacheKey(namespace: string, key: string) {
  return `${namespace}:${key}`;
}

// -- Config types & defaults --

export type ProjectGroupsConfig = {
  enabled: boolean;
  defaultCollapsed: boolean;
};

const defaults: Record<string, unknown> = {
  project_groups: {
    enabled: false,
    defaultCollapsed: false
  } as ProjectGroupsConfig,
};

export function registerDefault<T>(key: string, value: T) {
  defaults[key] = value;
}

// -- Accessors --

export async function getConfig<T>(
  namespace: string,
  key: string
): Promise<T> {
  const ck = cacheKey(namespace, key);
  const cached = cache.get(ck);

  if (cached && Date.now() < cached.expiresAt) {
    return mergeWithDefault<T>(key, cached.value);
  }

  const row = await db
    .select({ value: config.value })
    .from(config)
    .where(and(eq(config.namespace, namespace), eq(config.key, key)))
    .then((rows) => rows[0] ?? null);

  const value = row?.value ?? null;
  cache.set(ck, { value, expiresAt: Date.now() + TTL });

  return mergeWithDefault<T>(key, value);
}

export async function getGlobalConfig<T>(key: string): Promise<T> {
  return getConfig<T>("global", key);
}

function mergeWithDefault<T>(key: string, value: unknown): T {
  const fallback = defaults[key] as T | undefined;
  if (value == null) return fallback as T;
  if (fallback == null) return value as T;
  return { ...fallback, ...(value as Record<string, unknown>) } as T;
}
