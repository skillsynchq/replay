type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function patchThread(
  slug: string,
  data: Record<string, unknown>
): Promise<Result> {
  try {
    const res = await fetch(`/api/threads/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error ?? "Something went wrong" };
    }
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function getShares(
  slug: string
): Promise<
  Result<{ shares: { user_id: string; username: string; name: string }[] }>
> {
  try {
    const res = await fetch(`/api/threads/${slug}/share`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error ?? "Something went wrong" };
    }
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function shareThread(
  slug: string,
  username: string
): Promise<Result<{ shared_with: { username: string; name: string } }>> {
  try {
    const res = await fetch(`/api/threads/${slug}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error ?? "Something went wrong" };
    }
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function unshareThread(
  slug: string,
  userId: string
): Promise<Result> {
  try {
    const res = await fetch(`/api/threads/${slug}/share/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error ?? "Something went wrong" };
    }
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
