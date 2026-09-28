export type EventStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'POSTPONED';

export type MembershipRole =
  | 'STUDENT'
  | 'FACULTY'
  | 'CLUB_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'COLLEGE_ADMIN'
  | 'PLATFORM_ADMIN';

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
export type RegistrationStatus = 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
export type CollegeStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type ClubRecruitmentStatus = 'OPEN' | 'PAUSED' | 'CLOSED';
export type ClubVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';
export type ClubMembershipRole =
  | 'MEMBER'
  | 'LEAD'
  | 'SECRETARY'
  | 'PRESIDENT'
  | 'ADMIN'
  | 'CLUB_MENTOR'
  | 'CLUB_LEAD'
  | 'CLUB_SUB_LEAD'
  | 'ORGANIZER'
  | 'CORE_MEMBER';
export type ClubMembershipStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED';
export type NotificationType =
  | 'SYSTEM'
  | 'COLLEGE'
  | 'CLUB'
  | 'EVENT'
  | 'REGISTRATION';

export const CLUB_PERMISSIONS = [
  'CLUB_VIEW_MEMBERS',
  'CLUB_MANAGE_MEMBERS',
  'CLUB_EDIT_PROFILE',
  'CLUB_MANAGE_ROLES',
  'CLUB_CREATE_EVENT',
  'CLUB_EDIT_EVENT',
  'CLUB_DELETE_EVENT',
  'CLUB_PUBLISH_EVENT',
  'CLUB_VIEW_REGISTRATIONS',
  'CLUB_MANAGE_REGISTRATIONS',
  'CLUB_MARK_ATTENDANCE',
  'CLUB_POST_ANNOUNCEMENT',
  'CLUB_MANAGE_RECRUITMENT',
  'CLUB_VIEW_ANALYTICS',
  'CLUB_MANAGE_MEDIA',
  'CLUB_MANAGE_PERMISSIONS',
] as const;

export type ClubPermission = (typeof CLUB_PERMISSIONS)[number];
export type PermissionEffect = 'GRANT' | 'REVOKE';
export type EventOrganizerPermission =
  | 'EDIT_EVENT'
  | 'VIEW_REGISTRATIONS'
  | 'MANAGE_REGISTRATIONS'
  | 'MARK_ATTENDANCE'
  | 'SEND_EVENT_NOTIFICATION';
export type ClubApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface CollegeSummary {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  status?: CollegeStatus;
}

export interface CollegeDetails extends CollegeSummary {
  officialEmailDomain: string | null;
  website: string | null;
  coverUrl: string | null;
  description: string | null;
  address: string | null;
  country: string;
}

export interface Membership {
  id: string;
  collegeId: string;
  role: MembershipRole;
  status: MembershipStatus;
  studentId: string | null;
  departmentId?: string | null;
  academicYear?: number | null;
  semester?: number | null;
  college: CollegeSummary;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  department?: { id: string; name: string; code: string } | null;
}

export interface CampusUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  memberships: Membership[];
  clubMemberships?: Array<{
    id: string;
    clubId: string;
    role: ClubMembershipRole;
    status: ClubMembershipStatus;
    joinedAt: string | null;
    club: { id: string; collegeId: string; name: string; slug: string; logoUrl: string | null };
  }>;
}

export interface Department {
  id: string;
  collegeId: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: CampusUser;
  tokens: AuthTokens;
}

export interface CampusEvent {
  id: string;
  collegeId: string;
  clubId: string | null;
  departmentId: string | null;
  title: string;
  slug: string;
  description: string;
  eventType: string;
  venue: string;
  onlineMeetingUrl: string | null;
  imageUrl: string | null;
  posterUrl: string | null;
  startsAt: string;
  endsAt: string;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  feeAmount: string | null;
  currency: string;
  registeredCount: number;
  status: EventStatus;
  isRegistered?: boolean;
}

export interface CampusClub {
  id: string;
  collegeId: string;
  departmentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  logoUrl: string | null;
  coverUrl: string | null;
  recruitmentStatus: ClubRecruitmentStatus;
  verificationStatus: ClubVerificationStatus;
  upcomingEventCount: number;
  memberCount?: number;
}

export interface CampusClubDetails extends CampusClub {
  upcomingEvents: CampusEvent[];
  access?: ClubAccess;
  announcements?: ClubAnnouncement[];
}

export interface ClubAccess {
  membershipId: string | null;
  role: ClubMembershipRole | null;
  permissions: ClubPermission[];
  isCollegeAdmin: boolean;
  canManageClub: boolean;
  canCreateEvent: boolean;
  canManageMembers: boolean;
  canManageRecruitment: boolean;
  canPostAnnouncement: boolean;
  canViewRegistrations: boolean;
  canManageRegistrations: boolean;
  canMarkAttendance: boolean;
  canViewAnalytics: boolean;
  canEditProfile: boolean;
  canReviewEvents: boolean;
}

export interface ClubMemberPermission {
  permission: ClubPermission;
  inherited: boolean;
  override: PermissionEffect | null;
  effective: boolean;
}

export interface ClubMember {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  studentId: string | null;
  department: { id: string; name: string; code: string } | null;
  academicYear: number | null;
  semester: number | null;
  role: ClubMembershipRole;
  status: ClubMembershipStatus;
  joinedAt: string | null;
  permissions: ClubMemberPermission[];
  eventsOrganized: number;
  attendanceCount: number;
}

export interface ClubDashboardSummary {
  club: CampusClub;
  access: ClubAccess;
  memberCount: number;
  pendingRequests: number;
  upcomingEvents: number;
  registrations: number;
  attendance: number;
  roleDistribution: Array<{ role: ClubMembershipRole; count: number }>;
}

export interface EventOrganizer {
  id: string;
  eventId: string;
  userId: string;
  role: string;
  permissions: EventOrganizerPermission[];
  assignedAt: string;
  user: { firstName: string; lastName: string; email: string; avatarUrl: string | null };
}

export interface EventAccess {
  isTenantAdmin: boolean;
  isPrimaryOrganizer: boolean;
  canReview: boolean;
  canPublish: boolean;
  canManageOrganizers: boolean;
  permissions: EventOrganizerPermission[];
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  registrationId: string;
  checkedInById: string;
  checkedInAt: string;
  method: 'QR' | 'MANUAL';
  status: 'PRESENT' | 'REVOKED';
}

export interface ClubAnnouncement {
  id: string;
  clubId: string;
  title: string;
  content: string;
  publishedAt: string;
  author: { id: string; firstName: string; lastName: string };
}

export interface ClubApplication {
  id: string;
  clubId: string;
  userId: string;
  answers: unknown;
  status: ClubApplicationStatus;
  createdAt: string;
  applicant?: { firstName: string; lastName: string; email: string };
}

export interface CollegeAdminSummary {
  students: number;
  faculty: number;
  clubs: number;
  events: number;
  activeMemberships: number;
  pendingMemberships: number;
  pendingClubs: number;
  pendingEvents: number;
}

export interface CollegeAnnouncementResult {
  delivered: number;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  registrationCode: string;
  qrToken: string;
  registeredAt: string;
  cancelledAt: string | null;
  checkedInAt: string | null;
  event: CampusEvent;
  registrant?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface DashboardSummary {
  upcomingEvents: number;
  activeClubs: number;
  registrations: number;
  unreadNotifications: number;
}

export interface CampusNotification {
  id: string;
  collegeId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
