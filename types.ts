export enum AppTab {
  DASHBOARD = 'dashboard',
  DOCUMENTS = 'documents',
  ADMIN = 'admin',
  PROFILE = 'profile'
}

export enum DocumentType {
  EXAM = 'Đề thi',
  OUTLINE = 'Đề cương',
  REFERENCE = 'Tài liệu tham khảo',
  LECTURE = 'Bài giảng',
  ANSWER = 'Đáp án'
}

export interface User {
  id: string;
  name: string;
  email: string;
  school: string;
  major: string;
  avatar: string;
  points: number;
  role?: string;
  rank?: number;
  badge?: string;
  totalDocuments?: number;
  totalDownloads?: number;
  averageRating?: number;
}

export interface Document {
  id: string;
  title: string;
  school: string;
  subject: string;
  type: string;
  year: string;
  uploader?: string;
  uploaderId?: string;
  uploaderPublicId?: string;
  uploaderAvatar?: string;
  createdAt: string;
  views: number;
  downloads: number;
  status?: string;
  description?: string;
  fileUrl?: string;
}
