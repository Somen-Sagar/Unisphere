import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assignEventOrganizerSchema,
  registerSchema,
  updateEventSchema,
  updateCollegeMembershipSchema,
} from '../dist/index.js';

const base = {
  email: 'person@example.edu',
  password: 'SecurePass123',
  firstName: 'Campus',
  lastName: 'Member',
  termsAccepted: true,
  college: {
    mode: 'join',
    collegeId: 'college-a',
  },
};

test('public registration cannot request college administrator authority', () => {
  const result = registerSchema.safeParse({ ...base, role: 'COLLEGE_ADMIN' });
  assert.equal(result.success, false);
});

test('public registration can request faculty verification', () => {
  const result = registerSchema.safeParse({ ...base, role: 'FACULTY' });
  assert.equal(result.success, true);
});

test('attendance delegation also requires registration visibility', () => {
  const result = assignEventOrganizerSchema.safeParse({
    userId: 'user-a',
    role: 'ATTENDANCE_MANAGER',
    permissions: ['MARK_ATTENDANCE'],
  });
  assert.equal(result.success, false);
});

test('valid attendance delegation includes registration visibility', () => {
  const result = assignEventOrganizerSchema.safeParse({
    userId: 'user-a',
    role: 'ATTENDANCE_MANAGER',
    permissions: ['VIEW_REGISTRATIONS', 'MARK_ATTENDANCE'],
  });
  assert.equal(result.success, true);
});

test('status-only event updates do not inject content defaults', () => {
  const result = updateEventSchema.parse({ status: 'APPROVED' });
  assert.deepEqual(result, { status: 'APPROVED' });
});

test('college membership updates cannot assign legacy club admin roles', () => {
  const result = updateCollegeMembershipSchema.safeParse({
    role: 'CLUB_ADMIN',
  });
  assert.equal(result.success, false);
});
