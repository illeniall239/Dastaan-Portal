// PostgREST returns at most 1000 rows per request, so read every page.
// The query must have a stable order (e.g. .order("id")) for paging to be reliable.
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < size) return out;
  }
}
