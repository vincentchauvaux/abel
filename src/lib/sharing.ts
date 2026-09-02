import { clearAuthToken, readGoogleToken, SYNC_URL } from '@/lib/google';

export type SharingRole = 'owner' | 'member' | 'guardian';
export type InviteRole = 'member' | 'guardian';

export type SharingMember = {
  role: SharingRole;
  userId: string;
  isYou: boolean;
  label: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type SharingInvite = {
  id: string;
  email?: string;
  status?: string;
  role?: InviteRole;
  expiresAt: string;
};

export type ReceivedInvite = {
  id: string;
  babyName: string;
  role?: InviteRole;
  expiresAt: string;
};

export type SharingState = {
  babyId: string | null;
  babyName: string | null;
  role: SharingRole | null;
  members: SharingMember[];
  sentInvites: SharingInvite[];
  receivedInvites: ReceivedInvite[];
  pendingInvitesCount: number;
};

type ApiResult<T> = T | 'auth' | 'error' | 'rate_limit' | { error: string };

async function sharingFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const token = readGoogleToken();
  if (!token) return 'auth';
  const res = await fetch(`${SYNC_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    clearAuthToken();
    return 'auth';
  }
  if (res.status === 429) return 'rate_limit';
  if (!res.ok) {
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) return { error: body.error };
    } catch {
      /* ignore */
    }
    return 'error';
  }
  return (await res.json()) as T;
}

export async function fetchSharing(): Promise<ApiResult<SharingState>> {
  return sharingFetch<SharingState>('/sharing');
}

export async function createInvite(
  email: string,
  role: InviteRole = 'member',
): Promise<ApiResult<{ ok: true; id: string }>> {
  return sharingFetch('/invites', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function acceptInvite(id: string): Promise<ApiResult<{ ok: true; babyId: string }>> {
  return sharingFetch(`/invites/${id}/accept`, { method: 'POST' });
}

export async function declineInvite(id: string): Promise<ApiResult<{ ok: true }>> {
  return sharingFetch(`/invites/${id}/decline`, { method: 'POST' });
}

export async function cancelInvite(id: string): Promise<ApiResult<{ ok: true }>> {
  return sharingFetch(`/invites/${id}`, { method: 'DELETE' });
}

export async function removeGuardian(userId: string): Promise<ApiResult<{ ok: true }>> {
  return sharingFetch(`/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export const INVITE_ERROR_LABEL: Record<string, string> = {
  invalid_email: 'Adresse e-mail invalide.',
  self_invite: 'Tu ne peux pas t’inviter toi-même.',
  max_members: 'Ce bébé a déjà un co-parent.',
  max_guardians: 'Ce bébé a déjà le maximum de gardiens.',
  already_invited: 'Une invitation est déjà en attente pour cet e-mail.',
  has_own_baby: 'Tu as déjà un profil bébé sur ce compte. Utilise un autre compte Google.',
  already_member: 'Tu fais déjà partie de ce bébé.',
  expired: 'Cette invitation n’est plus valable.',
  forbidden: 'Action non autorisée.',
  not_found: 'Invitation introuvable.',
};

export function inviteRoleOf(invite: { role?: string } | null | undefined): InviteRole {
  return invite?.role === 'guardian' ? 'guardian' : 'member';
}

export function memberRoleTitle(role: SharingRole): string {
  if (role === 'owner') return 'Propriétaire';
  if (role === 'guardian') return 'Gardien';
  return 'Co-parent';
}
