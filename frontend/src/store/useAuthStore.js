import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('sp_access_token') || null,
  organizations: [],
  activeOrganizationId: localStorage.getItem('sp_org_id') || null,
  isBootstrapped: false,

  setAuth: ({ user, accessToken, organizations }) => {
    if (accessToken) localStorage.setItem('sp_access_token', accessToken);
    const currentOrgId = get().activeOrganizationId;
    const validOrg =
      organizations?.find((o) => o.organization._id === currentOrgId)?.organization._id ||
      organizations?.[0]?.organization._id ||
      null;

    if (validOrg) localStorage.setItem('sp_org_id', validOrg);

    set({
      user,
      accessToken: accessToken || get().accessToken,
      organizations: organizations || [],
      activeOrganizationId: validOrg,
      isBootstrapped: true,
    });
  },

  setActiveOrganization: (orgId) => {
    localStorage.setItem('sp_org_id', orgId);
    set({ activeOrganizationId: orgId });
  },

  setBootstrapped: (val) => set({ isBootstrapped: val }),

  clearAuth: () => {
    localStorage.removeItem('sp_access_token');
    localStorage.removeItem('sp_org_id');
    set({
      user: null,
      accessToken: null,
      organizations: [],
      activeOrganizationId: null,
      isBootstrapped: true,
    });
  },
}));
