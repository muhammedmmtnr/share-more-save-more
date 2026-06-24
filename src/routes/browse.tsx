import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/listing-card";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse shares — ShareX" },
      { name: "description", content: "Browse all active cost-sharing opportunities across mobility, stays, food, software, travel and more." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const { data: listings, isLoading } = useQuery({
    queryKey: ["all-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Browse all shares</h1>
          <p className="mt-2 text-muted-foreground">Discover ways to save across every category.</p>
        </header>

        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(c => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
            >
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </Link>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading shares…</div>
        ) : !listings || listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <h3 className="text-lg font-semibold">No shares yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Be the first to post one and start saving.</p>
            <Link to="/new" className="inline-flex mt-6 items-center justify-center rounded-full bg-[image:var(--gradient-hero)] text-white px-5 py-2 text-sm font-medium">
              Post a share
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
