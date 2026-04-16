import { useFetch } from "./useFetch";
import type {
  CustomerDetail,
  CustomerListResponse,
  VisitRecord,
  SpendingYear,
} from "@/lib/types";

export function useCustomers(params: {
  grade?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  return useFetch<CustomerListResponse>("/customers", params);
}

export function useCustomer(id: string) {
  return useFetch<CustomerDetail>(`/customers/${id}`);
}

export function useCustomerVisits(id: string) {
  return useFetch<VisitRecord[]>(`/customers/${id}/visits`);
}

export function useCustomerSpending(id: string) {
  return useFetch<SpendingYear[]>(`/customers/${id}/spending`);
}

type AiAction = {
  id: string;
  type: string;
  detail: string;
  impact: string;
  status: string;
};

export function useCustomerAiActions(id: string) {
  return useFetch<AiAction[]>(`/customers/${id}/ai-actions`);
}
