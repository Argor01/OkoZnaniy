export interface Dispute {
  id: number;
  order: {
    id: number;
    title: string;
    client: { id: number; username: string };
    expert: { id: number; username: string } | null;
  };
  reason: string;
  resolved: boolean;
  result: string | null;
  arbitrator: { id: number; username: string } | null;
  created_at: string;
}

export interface CreateDisputeRequest {
  reason: string;
}

export interface AssignArbitratorRequest {
  arbitrator_id: number;
}

export interface ResolveDisputeRequest {
  result: string;
}
