import { apiClient } from '@/api/client';
import { 
  CreateExpertRatingRequest, 
  ExpertStatistics, 
  Education, 
  ExpertApplication, 
  CreateExpertApplicationRequest, 
  Specialization, 
  CreateSpecializationRequest, 
  ExpertReview 
} from '@/features/expert/types/experts';

export type { 
  CreateExpertRatingRequest, 
  ExpertStatistics, 
  Education, 
  ExpertApplication, 
  CreateExpertApplicationRequest, 
  Specialization, 
  CreateSpecializationRequest, 
  ExpertReview 
};

export const expertsApi = {
  async getReviews(expertId?: number): Promise<ExpertReview[]> {
    const params = expertId ? { expert: expertId } : {};
    const { data } = await apiClient.get('/experts/ratings/', { params });
    const raw: unknown = (data as { results?: unknown })?.results ?? data;
    const items: unknown[] = Array.isArray(raw) ? raw : [];
    const debugEnabled = import.meta.env.DEV && localStorage.getItem('debug_reviews') === '1';

    const extractNonEmptyString = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const extractAvatarString = (value: unknown): string | undefined => {
      const direct = extractNonEmptyString(value);
      if (direct) return direct;
      if (!value || typeof value !== 'object') return undefined;
      const obj = value as Record<string, unknown>;
      return extractNonEmptyString(
        obj.url ??
          obj.path ??
          obj.src ??
          obj.file ??
          obj.original ??
          obj.absolute_url ??
          obj.absoluteUrl ??
          obj.avatar ??
          obj.avatar_url ??
          obj.avatarUrl
      );
    };

    const baseReviews = items.map((r) => {
      const src = r as Record<string, unknown>;

      const maybeClient = src.client;
      const maybeUser =
        (src.client_user as Record<string, unknown> | undefined) ??
        (src.client_details as Record<string, unknown> | undefined) ??
        (src.client_info as Record<string, unknown> | undefined) ??
        (src.user as Record<string, unknown> | undefined) ??
        (src.author as Record<string, unknown> | undefined) ??
        (src.reviewer as Record<string, unknown> | undefined);

      const clientObject: Record<string, unknown> | undefined =
        maybeClient && typeof maybeClient === 'object' ? (maybeClient as Record<string, unknown>) : maybeUser;

      const clientIdRaw =
        (clientObject?.id as unknown) ??
        (clientObject?.pk as unknown) ??
        (typeof maybeClient === 'number' ? maybeClient : undefined) ??
        (src.client_id as unknown) ??
        (src.user_id as unknown);

      const clientId = typeof clientIdRaw === 'number' ? clientIdRaw : Number(clientIdRaw);

      const firstNameRaw =
        (clientObject?.first_name as unknown) ??
        (clientObject?.firstName as unknown) ??
        (src.client_first_name as unknown) ??
        (src.user_first_name as unknown);
      const lastNameRaw =
        (clientObject?.last_name as unknown) ??
        (clientObject?.lastName as unknown) ??
        (src.client_last_name as unknown) ??
        (src.user_last_name as unknown);

      const usernameRaw =
        (clientObject?.username as unknown) ??
        (clientObject?.login as unknown) ??
        (src.client_username as unknown) ??
        (src.user_username as unknown);

      const avatarRaw =
        (clientObject?.avatar as unknown) ??
        (clientObject?.avatar_url as unknown) ??
        (clientObject?.avatarUrl as unknown) ??
        (src.client_avatar as unknown) ??
        (src.client_avatar_url as unknown) ??
        (src.avatar as unknown) ??
        (src.avatar_url as unknown);

      const client = {
        id: Number.isFinite(clientId) ? clientId : 0,
        username: typeof usernameRaw === 'string' ? usernameRaw : undefined,
        first_name: typeof firstNameRaw === 'string' ? firstNameRaw : '',
        last_name: typeof lastNameRaw === 'string' ? lastNameRaw : '',
        avatar: extractAvatarString(avatarRaw),
      };

      const commentRaw = src.comment;
      const textRaw = src.text;
      const comment = typeof commentRaw === 'string' ? commentRaw : undefined;
      const text = typeof textRaw === 'string' ? textRaw : undefined;

      return {
        ...(src as unknown as ExpertReview),
        client,
        comment,
        text: text ?? comment ?? '',
      };
    });

    const idsToHydrate = Array.from(
      new Set(
        baseReviews
          .map((r) => r.client?.id)
          .filter((id): id is number => typeof id === 'number' && id > 0)
          .filter((id) => baseReviews.some((r) => r.client?.id === id && !r.client?.avatar))
      )
    );

    if (debugEnabled) {
      (window as unknown as { __debugReviews?: unknown }).__debugReviews = {
        expertId,
        firstRaw: items[0],
        firstMapped: baseReviews[0],
        idsToHydrate,
      };
    }

    if (idsToHydrate.length === 0) return baseReviews;

    const hydrated = await Promise.all(
      idsToHydrate.map(async (id) => {
        try {
          const { data: u } = await apiClient.get(`/users/${id}/`);
          return [id, u as Record<string, unknown>] as const;
        } catch (e) {
          if (debugEnabled) {
            (window as unknown as { __debugReviewsUserHydration?: unknown }).__debugReviewsUserHydration = {
              ...(window as unknown as { __debugReviewsUserHydration?: Record<string, unknown> }).__debugReviewsUserHydration,
              [id]: e,
            };
          }
          return null;
        }
      })
    );

    const usersById = new Map<number, Record<string, unknown>>();
    hydrated.forEach((pair) => {
      if (pair) usersById.set(pair[0], pair[1]);
    });

    if (usersById.size === 0) return baseReviews;

    return baseReviews.map((review) => {
      const u = usersById.get(review.client.id);
      if (!u) return review;

      const profile =
        (u.profile as Record<string, unknown> | undefined) ??
        (u.user_profile as Record<string, unknown> | undefined) ??
        (u.details as Record<string, unknown> | undefined);

      const avatarRaw =
        (u.avatar as unknown) ??
        (u.avatar_url as unknown) ??
        (u.avatarUrl as unknown) ??
        (profile?.avatar as unknown) ??
        (profile?.avatar_url as unknown) ??
        (profile?.avatarUrl as unknown);
      const usernameRaw = (u.username as unknown) ?? (u.login as unknown);
      const firstNameRaw = (u.first_name as unknown) ?? (u.firstName as unknown);
      const lastNameRaw = (u.last_name as unknown) ?? (u.lastName as unknown);

      return {
        ...review,
        client: {
          ...review.client,
          avatar: review.client.avatar || extractAvatarString(avatarRaw),
          username: review.client.username || (typeof usernameRaw === 'string' ? usernameRaw : undefined),
          first_name: review.client.first_name || (typeof firstNameRaw === 'string' ? firstNameRaw : ''),
          last_name: review.client.last_name || (typeof lastNameRaw === 'string' ? lastNameRaw : ''),
        },
      };
    });
  },

  async rateExpert(payload: CreateExpertRatingRequest) {
    const { data } = await apiClient.post('/experts/ratings/', payload);
    return data;
  },

  async getExpertStatistics(expertId: number): Promise<ExpertStatistics> {
    const { data } = await apiClient.get(`/experts/statistics/?expert=${expertId}`);
    const raw = data?.results?.[0] || data;
    if (!raw || typeof raw !== 'object') return raw;
    const average_rating_raw = (raw as { average_rating?: unknown }).average_rating;
    const average_rating =
      typeof average_rating_raw === 'number'
        ? average_rating_raw
        : typeof average_rating_raw === 'string'
          ? Number(average_rating_raw)
          : 0;
    const total_earnings_raw = (raw as { total_earnings?: unknown }).total_earnings;
    const total_earnings =
      typeof total_earnings_raw === 'number'
        ? total_earnings_raw
        : typeof total_earnings_raw === 'string'
          ? Number(total_earnings_raw)
          : null;
    return {
      ...(raw as ExpertStatistics),
      average_rating: Number.isFinite(average_rating) ? average_rating : 0,
      total_earnings: Number.isFinite(total_earnings ?? NaN) ? total_earnings : null,
    };
  },

  async getMyApplication(): Promise<ExpertApplication | null> {
    try {
      const { data } = await apiClient.get('/experts/applications/my_application/');
      
      return data;
    } catch (error: unknown) {
      
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 403 || status === 400) {
        return null;
      }
      throw error;
    }
  },

  async createApplication(payload: CreateExpertApplicationRequest): Promise<ExpertApplication> {
    const { data } = await apiClient.post('/experts/applications/', payload);
    return data;
  },

  async updateApplication(id: number, payload: Partial<CreateExpertApplicationRequest>): Promise<ExpertApplication> {
    const { data } = await apiClient.patch(`/experts/applications/${id}/`, payload);
    return data;
  },

  
  async getSpecializations(): Promise<Specialization[]> {
    const { data } = await apiClient.get('/experts/specializations/');
    return data.results || data;
  },

  async createSpecialization(payload: CreateSpecializationRequest): Promise<Specialization> {
    const { data } = await apiClient.post('/experts/specializations/', payload);
    return data;
  },

  async updateSpecialization(id: number, payload: Partial<CreateSpecializationRequest>): Promise<Specialization> {
    const { data } = await apiClient.patch(`/experts/specializations/${id}/`, payload);
    return data;
  },

  async deleteSpecialization(id: number): Promise<void> {
    await apiClient.delete(`/experts/specializations/${id}/`);
  },
};


