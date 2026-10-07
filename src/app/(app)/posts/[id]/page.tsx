import { notFound } from "next/navigation";
import { PostEditor } from "@/components/posts/post-editor";
import { listPillars } from "@/lib/pillars/queries";
import { getPost } from "@/lib/posts/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ user }, post, pillars] = await Promise.all([requireUser(), getPost(id), listPillars()]);
  if (!post) notFound();

  return (
    <div>
      <PostEditor key={post.id} post={post} pillars={pillars} userId={user.id} authorEmail={user.email ?? ""} />
    </div>
  );
}
