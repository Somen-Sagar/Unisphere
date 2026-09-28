import { CLUB_PERMISSION_KEY } from '../club-authorization/club-permission.decorator';
import { ClubManagementController } from './club-management.controller';

function requiredPermission(method: keyof ClubManagementController) {
  return Reflect.getMetadata(
    CLUB_PERMISSION_KEY,
    // Reading the function object is required to inspect method metadata; it
    // is never invoked outside its controller instance.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ClubManagementController.prototype[method],
  ) as string | undefined;
}

describe('ClubManagementController permission wiring', () => {
  it('protects member management with CLUB_MANAGE_MEMBERS', () => {
    expect(requiredPermission('addMember')).toBe('CLUB_MANAGE_MEMBERS');
    expect(requiredPermission('updateMember')).toBe('CLUB_MANAGE_MEMBERS');
    expect(requiredPermission('removeMember')).toBe('CLUB_MANAGE_MEMBERS');
  });

  it('protects recruitment and announcements with their effective permissions', () => {
    expect(requiredPermission('applications')).toBe('CLUB_MANAGE_RECRUITMENT');
    expect(requiredPermission('reviewApplication')).toBe(
      'CLUB_MANAGE_RECRUITMENT',
    );
    expect(requiredPermission('createAnnouncement')).toBe(
      'CLUB_POST_ANNOUNCEMENT',
    );
  });

  it('protects analytics with CLUB_VIEW_ANALYTICS', () => {
    expect(requiredPermission('dashboard')).toBe('CLUB_VIEW_ANALYTICS');
  });
});
