export type BusinessCategory = "barber" | "spa" | "restaurant" | "fitness" | "dentist" | "salon" | "veterinary" | "other";

export type MessageStatus = "Not Sent" | "Sent" | "Opened" | "Replied";
export type ReplyStatus = "No Reply" | "Auto Reply" | "Manual Reply";

export interface Lead {
  businessName: string;
  category: BusinessCategory;
  city: string;
  website: string;
  email: string;
  phone?: string;
  searchDate: string;
  messageStatus: MessageStatus;
  dateSent?: string;
  firstContactMessage?: string;
  replyStatus: ReplyStatus;
  replyDate?: string;
  replyContent?: string;
  campaignId?: string;
  notes?: string;
  sheetRow?: number;
}

export interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

export interface CampaignConfig {
  id: string;
  category: BusinessCategory;
  cities: string[];
  maxLeads: number;
  delayBetweenEmails: number;
}

export interface BatchCampaigns {
  campaigns: CampaignConfig[];
}

export interface CampaignReport {
  campaignId: string;
  startedAt: string;
  completedAt?: string;
  searchesPerformed: number;
  leadsFound: number;
  emailsExtracted: number;
  emailsSent: number;
  emailsFailed: number;
  errors: string[];
}
