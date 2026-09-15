import { z } from 'zod';

export const loginSchema = z.any();
export const registerSchema = z.any();
export const refreshSessionSchema = z.any();
export const eventQuerySchema = z.any();
export const createEventSchema = z.any();
export const updateEventSchema = z.any();
export const createCollegeSchema = z.any();
export const updateCollegeSchema = z.any();
export const createDepartmentSchema = z.any();
export const createClubSchema = z.any();
export const updateClubSchema = z.any();

export type LoginInput = any;
export type RegisterInput = any;
export type RefreshSessionInput = any;
export type EventQueryInput = any;
export type CreateEventInput = any;
export type UpdateEventInput = any;
export type CreateCollegeInput = any;
export type UpdateCollegeInput = any;
export type CreateDepartmentInput = any;
export type CreateClubInput = any;
export type UpdateClubInput = any;
