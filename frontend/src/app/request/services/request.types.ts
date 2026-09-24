// Interfaces for Module 2: Requests (Endpoints 2.1 and 2.2)

export interface RequestStudent {
  student_code: string;
  name: string;
  email: string;
}

export interface RequestAcademicData {
  source_course: string;
  target_course: string;
  source_credits: number;
  target_credits: number;
}

export interface RequestDocument {
  name: string;
  mime_type: string;
  size_bytes: number;
}

export interface AcademicRequestPayload {
  type: string; // e.g. "CREDIT_TRANSFER"
  student: RequestStudent;
  academic_data: RequestAcademicData;
  documents: RequestDocument[];
}

export interface AcademicRequestResponseData extends AcademicRequestPayload {
  request_id: string;
  status: string; // e.g. "SUBMITTED"
  observations: string[];
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ValidateResponseData {
  valid: boolean;
  errors: any[];
  warnings: string[];
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    request_id: string;
    api_version: string;
    timestamp?: string;
  };
}

export interface ApiErrorDetail {
  field: string;
  reason: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
  meta: {
    request_id: string;
    api_version: string;
  };
}

export interface EvaluationPayload {
  request: {
    request_id: string;
    status: string;
    version: number;
  };
  evaluation: {
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
    actor: {
      id: string;
      role: string;
    };
    observation: string;
  };
}

export interface EvaluationResponseData {
  request: {
    request_id: string;
    status: string;
    version: number;
    updated_at: string;
  };
  event: any;
}