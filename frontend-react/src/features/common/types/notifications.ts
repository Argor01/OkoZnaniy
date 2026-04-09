export interface Notification {
  id: number;
  type: string;
  type_display: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  related_object_id?: number;
  related_object_type?: string;
  is_read: boolean;
  created_at: string;
}
