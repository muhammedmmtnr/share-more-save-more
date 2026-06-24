import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Calendar, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/listings/$id")({
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const [listingRes, participantsRes] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id).maybeSingle(),
        supabase.from("listing_participants").select("user_id").eq("listing_id", id),
      ]);
      if (listingRes.error) throw listingRes.error;
      let owner = null;
      if (listingRes.data) {
        const { data: prof } = await supabase.from("profiles").select("display_name, city").eq("id", listingRes.data.owner_id).maybeSingle();
        owner = prof;
      }
      return {
        listing: listingRes.data,
        participants: participantsRes.data ?? [],
        owner,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!data?.listing) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Share not found</h1>
          <Link to="/browse" className="mt-4 inline-block text-primary hover:underline">Browse other shares</Link>
        </div>
      </div>
    );
  }

  const listing = data.listing;
  const cat = CATEGORY_BY_SLUG[listing.category];
  const Icon = cat?.icon;
  const isOwner = user?.id === listing.owner_id;
  const joined = data.participants.some(p => p.user_id === user?.id);
  const spotsLeft = Math.max(0, listing.capacity - data.participants.length - 1);

  const handleJoin = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const { error } = await supabase.from("listing_participants").insert({
      listing_id: listing.id, user_id: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("You've joined this share!"); qc.invalidateQueries({ queryKey: ["listing", id] }); }
  };

  const handleLeave = async () => {
    const { error } = await supabase.from("listing_participants")
      .delete().eq("listing_id", listing.id).eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else { toast.success("You've left this share"); qc.invalidateQueries({ queryKey: ["listing", id] }); }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <Link to="/browse" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to browse
        </Link>

        <div className={`rounded-3xl bg-gradient-to-br ${cat?.color} p-8 sm:p-10 text-white mb-8 relative overflow-hidden`}>
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 text-xs font-medium mb-4">
              {Icon && <Icon className="h-3.5 w-3.5" />} {cat?.label}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{listing.title}</h1>
            {data.owner && (
              <p className="mt-3 text-white/90 text-sm">Hosted by {data.owner.display_name}{data.owner.city && ` · ${data.owner.city}`}</p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">About this share</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {listing.location && (
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</div>
                  <div className="font-medium">{listing.location}</div>
                </div>
              )}
              {listing.starts_at && (
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> When</div>
                  <div className="font-medium">{new Date(listing.starts_at).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
              {listing.cost_per_person != null && (
                <div className="mb-4">
                  <div className="text-3xl font-bold text-primary">₹{Number(listing.cost_per_person).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">per person</div>
                </div>
              )}
              {listing.total_cost != null && (
                <div className="text-sm text-muted-foreground mb-4">Total: ₹{Number(listing.total_cost).toLocaleString()}</div>
              )}
              <div className="flex items-center gap-2 text-sm mb-5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{data.participants.length + 1} of {listing.capacity} joined · {spotsLeft} spots left</span>
              </div>
              {isOwner ? (
                <Button disabled className="w-full rounded-full">You're hosting this</Button>
              ) : joined ? (
                <Button onClick={handleLeave} variant="outline" className="w-full rounded-full">Leave share</Button>
              ) : spotsLeft === 0 ? (
                <Button disabled className="w-full rounded-full">Share is full</Button>
              ) : (
                <Button onClick={handleJoin} className="w-full rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95">
                  {user ? "Join this share" : "Sign in to join"}
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
