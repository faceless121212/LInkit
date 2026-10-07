import { BoardView } from "@/components/board/board-view";
import { listPosts } from "@/lib/posts/queries";

export const metadata = { title: "Board" };

export default async function BoardPage() {
  const posts = await listPosts();
  return <BoardView posts={posts} />;
}
