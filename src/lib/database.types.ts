export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─── Row shapes ───────────────────────────────────────────────────────────────

export interface OrgRow {
  id: string;
  clerk_org_id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportRow {
  id: string;
  org_id: string;
  period_key: string;
  workers_json: Json;
  usage_events_json: Json;
  rate_cards_json: Json;
  row_counts: Json;
  created_by: string;
  created_at: string;
}

export interface ScenarioRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  config_json: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  org_id: string;
  event_type: string;
  actor_clerk_id: string;
  payload: Json;
  created_at: string;
}

export interface MeterEventRow {
  id: string;
  org_id: string;
  event_type: string;
  quantity: number;
  period_key: string;
  metadata: Json | null;
  created_at: string;
}

export interface ActionItemRow {
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
}

export interface ExceptionOverrideRow {
  id: string;
  org_id: string;
  exception_key: string;
  approved_by: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

export interface CloseStepRow {
  id: string;
  org_id: string;
  period_key: string;
  step_key: string;
  done: boolean;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Database type (required by createClient<Database>) ───────────────────────

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrgRow;
        Insert: {
          id?: string;
          clerk_org_id: string;
          name: string;
          plan?: 'free' | 'pro' | 'enterprise';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          plan?: 'free' | 'pro' | 'enterprise';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          updated_at?: string;
        };
      };
      imports: {
        Row: ImportRow;
        Insert: {
          id?: string;
          org_id: string;
          period_key: string;
          workers_json?: Json;
          usage_events_json?: Json;
          rate_cards_json?: Json;
          row_counts?: Json;
          created_by: string;
          created_at?: string;
        };
        Update: never;
      };
      scenarios: {
        Row: ScenarioRow;
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          config_json?: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          config_json?: Json;
          updated_at?: string;
        };
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: {
          id?: string;
          org_id: string;
          event_type: string;
          actor_clerk_id: string;
          payload?: Json;
          created_at?: string;
        };
        Update: never;
      };
      meter_events: {
        Row: MeterEventRow;
        Insert: {
          id?: string;
          org_id: string;
          event_type: string;
          quantity?: number;
          period_key: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
      action_items: {
        Row: ActionItemRow;
        Insert: {
          id?: string;
          org_id: string;
          item_id: string;
          type: string;
          severity: string;
          status?: string;
          dismissed_by?: string | null;
          dismissed_at?: string | null;
          period_key: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          dismissed_by?: string | null;
          dismissed_at?: string | null;
          updated_at?: string;
        };
      };
      exception_overrides: {
        Row: ExceptionOverrideRow;
        Insert: {
          id?: string;
          org_id: string;
          exception_key: string;
          approved_by: string;
          reason: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          reason?: string;
          expires_at?: string | null;
        };
      };
      close_steps: {
        Row: CloseStepRow;
        Insert: {
          id?: string;
          org_id: string;
          period_key: string;
          step_key: string;
          done?: boolean;
          locked_by?: string | null;
          locked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          done?: boolean;
          locked_by?: string | null;
          locked_at?: string | null;
          updated_at?: string;
        };
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
