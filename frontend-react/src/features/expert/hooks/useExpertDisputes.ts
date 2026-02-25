import { useQuery } from '@tanstack/react-query';
import { disputesApi, Dispute } from '@/features/arbitrator/api/disputes';
import { ArbitrationCase } from '../types';
import dayjs from 'dayjs';

export const useExpertDisputes = () => {
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['expert-disputes'],
    queryFn: disputesApi.getDisputes,
  });

  const mapDisputeToArbitrationCase = (dispute: Dispute): ArbitrationCase => {
    let status: ArbitrationCase['status'] = 'pending';
    
    if (dispute.resolved) {
        // Simple logic: if resolved and has result, it's resolved.
        // If result indicates rejection, maybe 'rejected'? 
        // For now, let's assume 'resolved' covers most completed cases unless result says otherwise.
        // Or we can check if result contains 'Отклонено' or similar if we want to be specific, 
        // but 'resolved' is safer if we don't have explicit status field.
        status = 'resolved'; 
    } else if (dispute.arbitrator) {
        status = 'in_review';
    } else {
        status = 'pending';
    }

    return {
      id: dispute.id,
      orderId: dispute.order.id,
      orderTitle: dispute.order.title,
      clientName: dispute.order.client.username,
      status,
      reason: dispute.reason,
      description: dispute.reason, // using reason as description since description is missing in Dispute
      createdAt: dispute.created_at,
      updatedAt: dispute.created_at, // using created_at as fallback
      amount: 0, // Placeholder as amount is not in Dispute
      decision: dispute.result || undefined,
      documents: [], // Placeholder
    };
  };

  const arbitrationCases: ArbitrationCase[] = Array.isArray(disputes) 
    ? disputes.map(mapDisputeToArbitrationCase) 
    : [];

  return {
    arbitrationCases,
    isLoading,
  };
};
