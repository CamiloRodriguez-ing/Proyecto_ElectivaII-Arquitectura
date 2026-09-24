export interface NotificationItem {
  id: string;
  request_id: string;
  status: string;
  recipient_name: string;
  recipient_email: string;
  date: string;
  subject: string;
  lead_html: string;
  subject_origin: string;
  subject_origin_credits: string;
  subject_target: string;
  subject_target_credits: string;
  observation: string;
  resolution: string;
  event_id: string;
  json_payload: any;
  isRead: boolean;
}

export interface PreviewPayload {
  event: {
    event_type: string;
    data: {
      new_status: string;
    };
  };
  recipient: {
    email: string;
  };
}

export interface PreviewResponse {
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  event_type: string;
}
