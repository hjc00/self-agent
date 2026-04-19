export interface Project {
  id: string;
  name: string;
  path: string;
  created_at: number;
  last_used: number | null;
}
