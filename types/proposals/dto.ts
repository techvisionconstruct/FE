import { ContractResponse } from '../contracts/dto';
import { CreatedByInfo } from '../created_by_info/dto';
import { PaginationLinks, PaginationMeta } from '../pagination/dto';
import { TemplateResponse } from '../templates/dto';

export interface ProposalResponse {
  is_contract_signed: boolean;
  id: string;
  name: string;
  description?: string;
  status: string;
  owner?: string;
  image?: string;
  template?: TemplateResponse;
  contract?: ContractResponse;
  client_name?: string;  client_email?: string;  client_phone?: string;
  client_address?: string;
  valid_until?: Date;
  project_location?: string;
  total_material_cost?: number;
  total_labor_cost?: number;
  total_cost?: number;
  total_with_markup?: number;
  created_at: Date;
  updated_at: Date;
  created_by?: CreatedByInfo;
  updated_by?: CreatedByInfo;
}

export interface ProposalListResponse {
  success: boolean;
  message: string;
  data: ProposalResponse[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

export interface ProposalDetailResponse {
  success: boolean;
  message: string;
  data?: ProposalResponse;
}

export interface ProposalCreateRequest {
  name: string;
  description?: string;
  status?: string;
  template: string | null;
  image?: string;
  owner?: string;
  client_name?: string;  client_email?: string;
  client_phone?: string;
  client_address?: string;
  valid_until?: string;
  project_location?: string;
  is_public?: boolean;
}

export interface ProposalUpdateRequest {
  name: string; // Changed from optional to required to match backend expectations
  description?: string;
  status?: string;  client_name?: string;  client_email?: string;
  client_phone?: string;
  client_address?: string;
  valid_until?: string;
  project_location?: string;
  is_public?: boolean;
  total_material_cost?: number;
  total_labor_cost?: number; // Fixed typo from 'label' to 'labor'
  total_cost?: number;
  total_with_markup_cost?: number;
  image?: string;
}
