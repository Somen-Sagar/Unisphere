import { z } from 'zod';

const optionalTrimmed = <Schema extends z.ZodType>(schema: Schema) =>
  z.union([z.literal('').transform(() => undefined), schema.optional()]);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.');

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: passwordSchema,
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  role: z
    .enum(['STUDENT', 'FACULTY'])
    .default('STUDENT')
    .optional(),
  termsAccepted: z.literal(true, {
    error: 'You must accept the UniSphere terms.',
  }),
  college: z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('join'),
      collegeId: z.string().min(1, 'Choose a college.'),
      department: optionalTrimmed(z.string().trim().min(2).max(120)),
      studentId: optionalTrimmed(z.string().trim().min(2).max(50)),
    }),
    z.object({
      mode: z.literal('create'),
      name: z.string().trim().min(3).max(160),
      slug: optionalTrimmed(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a URL-friendly slug.'),
      ),
      website: optionalTrimmed(z.url()),
      officialEmailDomain: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Enter a valid college email domain.'),
      emailDomain: optionalTrimmed(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9.-]+\.[a-z]{2}$/, 'Enter a valid college email domain.'),
      ),
      city: z.string().trim().min(2).max(80),
      state: z.string().trim().min(2).max(80),
      country: z.string().trim().min(2).max(80),
    }),
  ]),
});

export const webRegisterSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1),
});

export const eventQuerySchema = z.object({
  collegeId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  clubId: z.string().trim().min(1).optional(),
  status: z
    .enum([
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'PUBLISHED',
      'REGISTRATION_OPEN',
      'REGISTRATION_CLOSED',
      'ONGOING',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'POSTPONED',
    ])
    .optional(),
  upcoming: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

const eventSchemaBase = z.object({
  collegeId: z.string().min(1).optional(),
  clubId: z.string().min(1).optional(),
  departmentId: z.string().min(1).optional(),
  title: z.string().trim().min(5).max(150),
  slug: optionalTrimmed(
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a URL-friendly slug.'),
  ),
  description: z.string().trim().min(20).max(10_000),
  eventType: z.string().trim().min(2).max(80).optional(),
  venue: z.string().trim().min(2).max(200),
  onlineMeetingUrl: optionalTrimmed(z.url()),
  imageUrl: z.url().optional(),
  posterUrl: z.url().optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  registrationOpensAt: z.iso.datetime().optional(),
  registrationClosesAt: z.iso.datetime().optional(),
  capacity: z.number().int().positive().max(100_000).optional(),
  feeAmount: z.coerce.number().min(0).max(1_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
});

export const createEventSchema = eventSchemaBase
  .refine((event) => new Date(event.endsAt) > new Date(event.startsAt), {
    message: 'Event must end after it starts.',
    path: ['endsAt'],
  });

export const updateEventSchema = eventSchemaBase.partial().extend({
  status: z
    .enum([
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'PUBLISHED',
      'REGISTRATION_OPEN',
      'REGISTRATION_CLOSED',
      'ONGOING',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'POSTPONED',
    ])
    .optional(),
});

export const createCollegeSchema = z.object({
  name: z.string().trim().min(3).max(160),
  slug: optionalTrimmed(
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a URL-friendly slug.'),
  ),
  website: optionalTrimmed(z.url()),
  officialEmailDomain: optionalTrimmed(
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Enter a valid college email domain.'),
  ),
  city: optionalTrimmed(z.string().trim().min(2).max(80)),
  state: optionalTrimmed(z.string().trim().min(2).max(80)),
  country: z.string().trim().min(2).max(80).default('India'),
  description: optionalTrimmed(z.string().trim().max(2000)),
});

export const updateCollegeSchema = createCollegeSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().min(2).max(20),
  description: optionalTrimmed(z.string().trim().max(1000)),
});

export const createClubSchema = z.object({
  departmentId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(140),
  slug: optionalTrimmed(
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a URL-friendly slug.'),
  ),
  description: optionalTrimmed(z.string().trim().max(2000)),
  category: z.string().trim().min(2).max(80).default('General'),
  logoUrl: optionalTrimmed(z.url()),
  coverUrl: optionalTrimmed(z.url()),
  recruitmentStatus: z.enum(['OPEN', 'PAUSED', 'CLOSED']).default('CLOSED'),
});

export const updateClubSchema = createClubSchema.partial().extend({
  verificationStatus: z
    .enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'])
    .optional(),
  isActive: z.boolean().optional(),
});

export const clubRoleSchema = z.enum([
  'CLUB_MENTOR',
  'CLUB_LEAD',
  'CLUB_SUB_LEAD',
  'ORGANIZER',
  'CORE_MEMBER',
  'MEMBER',
]);

export const clubPermissionSchema = z.enum([
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
]);

export const clubMemberQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: clubRoleSchema.optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']).optional(),
  departmentId: z.string().min(1).optional(),
  academicYear: z.coerce.number().int().min(1).max(8).optional(),
  joinedFrom: z.iso.datetime().optional(),
  joinedTo: z.iso.datetime().optional(),
});

export const addClubMemberSchema = z.object({
  userId: z.string().min(1),
  role: clubRoleSchema.default('MEMBER'),
  status: z.enum(['PENDING', 'ACTIVE']).default('ACTIVE'),
});

export const updateClubMemberSchema = z.object({
  role: clubRoleSchema.optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']).optional(),
}).refine((value) => value.role !== undefined || value.status !== undefined, {
  message: 'Provide a role or membership status.',
});

export const setClubPermissionSchema = z.object({
  effect: z.enum(['GRANT', 'REVOKE', 'INHERIT']),
});

export const eventOrganizerPermissionSchema = z.enum([
  'EDIT_EVENT',
  'VIEW_REGISTRATIONS',
  'MANAGE_REGISTRATIONS',
  'MARK_ATTENDANCE',
  'SEND_EVENT_NOTIFICATION',
]);

export const assignEventOrganizerSchema = z.object({
  userId: z.string().min(1),
  role: z.string().trim().min(2).max(80).default('CO_ORGANIZER'),
  permissions: z.array(eventOrganizerPermissionSchema).max(5).default([]),
}).superRefine((value, context) => {
  const registrationDependent = value.permissions.some((permission) =>
    ['MANAGE_REGISTRATIONS', 'MARK_ATTENDANCE'].includes(permission),
  );
  if (
    registrationDependent &&
    !value.permissions.includes('VIEW_REGISTRATIONS')
  ) {
    context.addIssue({
      code: 'custom',
      path: ['permissions'],
      message:
        'Managing registrations or attendance also requires VIEW_REGISTRATIONS.',
    });
  }
});

export const manualAttendanceSchema = z.object({
  registrationId: z.string().min(1),
});

export const createClubAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(3).max(5000),
});

export const createClubApplicationSchema = z.object({
  answers: z.record(z.string(), z.union([z.string().max(2000), z.array(z.string().max(300))])).optional(),
});

export const reviewClubApplicationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const updateCollegeMembershipSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']).optional(),
  role: z.enum(['STUDENT', 'FACULTY', 'COLLEGE_ADMIN']).optional(),
  departmentId: z.string().min(1).nullable().optional(),
  academicYear: z.number().int().min(1).max(8).nullable().optional(),
  semester: z.number().int().min(1).max(16).nullable().optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: 'Provide at least one membership change.',
});

export const createCollegeAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(3).max(5000),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateCollegeInput = z.infer<typeof createCollegeSchema>;
export type UpdateCollegeInput = z.infer<typeof updateCollegeSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type ClubMemberQueryInput = z.infer<typeof clubMemberQuerySchema>;
export type AddClubMemberInput = z.infer<typeof addClubMemberSchema>;
export type UpdateClubMemberInput = z.infer<typeof updateClubMemberSchema>;
export type SetClubPermissionInput = z.infer<typeof setClubPermissionSchema>;
export type AssignEventOrganizerInput = z.infer<typeof assignEventOrganizerSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type CreateClubAnnouncementInput = z.infer<typeof createClubAnnouncementSchema>;
export type CreateClubApplicationInput = z.infer<typeof createClubApplicationSchema>;
export type ReviewClubApplicationInput = z.infer<typeof reviewClubApplicationSchema>;
export type UpdateCollegeMembershipInput = z.infer<typeof updateCollegeMembershipSchema>;
export type CreateCollegeAnnouncementInput = z.infer<typeof createCollegeAnnouncementSchema>;
