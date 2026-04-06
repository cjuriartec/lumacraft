import { SupabaseClient } from "@supabase/supabase-js";

export abstract class BaseRepository {
  constructor(
    protected readonly supabase: SupabaseClient,
    protected readonly tableName: string,
  ) {}

  protected get table() {
    return this.supabase.from(this.tableName);
  }
}
