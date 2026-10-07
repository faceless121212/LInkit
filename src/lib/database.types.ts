// Hand-written to match supabase/migrations. Regenerate with
// `pnpm supabase gen types typescript --local > src/lib/database.types.ts`
// once a database is running, if the schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PostStatus = "idea" | "draft" | "scheduled" | "published" | "cancelled";
export type PostKind = "single" | "thread";

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  status: PostStatus;
  kind: PostKind;
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string | null;
  pillar_id: string | null;
  notes: string | null;
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
};

type PostItemRow = {
  id: string;
  post_id: string;
  position: number;
  body: string;
  media_paths: string[];
  created_at: string;
  updated_at: string;
};

type PillarRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

type PostMetricsRow = {
  id: string;
  post_id: string;
  impressions: number | null;
  likes: number | null;
  reposts: number | null;
  replies: number | null;
  bookmarks: number | null;
  recorded_at: string;
};

type DigestLogRow = {
  day: string;
  sent_at: string;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      posts: {
        Row: PostRow;
        Insert: Optional<
          PostRow,
          | "id"
          | "title"
          | "status"
          | "kind"
          | "scheduled_at"
          | "published_at"
          | "published_url"
          | "pillar_id"
          | "notes"
          | "reminded_at"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<PostRow>;
        Relationships: [
          {
            foreignKeyName: "posts_pillar_id_fkey";
            columns: ["pillar_id"];
            isOneToOne: false;
            referencedRelation: "pillars";
            referencedColumns: ["id"];
          },
        ];
      };
      post_items: {
        Row: PostItemRow;
        Insert: Optional<PostItemRow, "id" | "body" | "media_paths" | "created_at" | "updated_at">;
        Update: Partial<PostItemRow>;
        Relationships: [
          {
            foreignKeyName: "post_items_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      pillars: {
        Row: PillarRow;
        Insert: Optional<PillarRow, "id" | "color" | "created_at" | "updated_at">;
        Update: Partial<PillarRow>;
        Relationships: [];
      };
      post_metrics: {
        Row: PostMetricsRow;
        Insert: Optional<
          PostMetricsRow,
          "id" | "impressions" | "likes" | "reposts" | "replies" | "bookmarks" | "recorded_at"
        >;
        Update: Partial<PostMetricsRow>;
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: true;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      digest_log: {
        Row: DigestLogRow;
        Insert: Optional<DigestLogRow, "sent_at">;
        Update: Partial<DigestLogRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_posts: {
        Args: { q: string };
        Returns: PostRow[];
      };
      owns_post: {
        Args: { p_post_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
