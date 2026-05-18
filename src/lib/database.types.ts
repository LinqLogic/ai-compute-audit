export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          clerk_org_id: string;
          name: string;
          plan: 'free' | 'pro' | 'enterprise';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };
      imports: {
        Row: {
          id: string;
          org_id: string;
          period_key: string;
          workers_json: Json;
          usage_events_json: Json;
          rate_cards_json: Json;
          row_counts: Json;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['imports']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['imports']['Insert']>;
      };
      scenarios: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          config_json: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['scenarios']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['scenarios']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          org_id: string;
          event_type: string;
          actor_clerk_id: string;
          payload: Json;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
      meter_events: {
        Row: {
          id: string;
          org_id: string;
          event_type: string;
          quantity: number;
          period_key: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meter_events']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
      action_items: {
        Row: {
          id: string;
          org_id: string;
          item_id: string;
          type: string;
          severity: string;
          status: string;
          dismissed_by: string | null;
          dismissed_at: string | null;
          period_key: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['action_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['action_items']['Insert']>;
      };
      exception_overrides: {
        Row: {
          id: string;
          org_id: string;
          exception_key: string;
          approved_by: string;
          reason: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exception_overrides']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['exception_overrides']['Insert']>;
      };
      close_steps: {
        Row: {
          id: string;
          org_id: string;
          period_key: string;
          step_key: string;
          done: boolean;
          locked_by: string | null;
          locked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['close_steps']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['close_steps']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_clerk_org_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      plan_type: 'free' | 'pro' | 'enterprise';
    };
  };
}
