import { z } from 'zod';

export const instagramUsernameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, ''))
  .pipe(z.string()
    .min(1, 'Instagram 아이디를 입력해주세요')
    .max(30, 'Instagram 아이디는 30자 이하여야 합니다')
    .regex(/^[A-Za-z0-9._]+$/, '영문, 숫자, 마침표, 밑줄만 사용할 수 있어요'));

export const joinRequestSchema = z.object({
  instagramUsername: instagramUsernameSchema,
});

export type JoinRequest = z.infer<typeof joinRequestSchema>;

// Matches /api/auth/me. OAuth credentials never cross this boundary.
export type SessionUser = { id: string; email: string | null; status: 'PENDING' | 'ACTIVE'; createdAt: string };
export type SessionResponse = { user: SessionUser };

export type OnboardingStatus = 'REQUESTED' | 'INVITED' | 'AUTHORIZING' | 'CONNECTED' | 'ERROR';

export type OnboardingRequestView = {
  id: string;
  instagramUsername: string;
  status: OnboardingStatus;
  createdAt: string;
  updatedAt: string;
};
