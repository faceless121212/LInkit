import { PostEditor } from "@/components/posts/post-editor";
import { listPillars } from "@/lib/pillars/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "New post" };

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ scheduled_at?: string }>;
}) {
  const [{ user }, pillars, params] = await Promise.all([requireUser(), listPillars(), searchParams]);
  const preset = params.scheduled_at && !Number.isNaN(Date.parse(params.scheduled_at)) ? params.scheduled_at : null;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 font-heading text-xl font-semibold">New post</h1>
      <PostEditor post={null} pillars={pillars} userId={user.id} presetScheduledAt={preset} />
    </div>
  );
}
