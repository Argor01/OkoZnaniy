import { usersApi } from './users';
import { ordersApi } from './orders';
import { financeApi } from './finance';
import { supportApi } from './support';
import { communicationApi } from './communication';
import { contentApi } from './content';
import { arbitrationApi } from './arbitration';

export * from '@/features/admin/types/admin';

export const adminPanelApi = {
  ...usersApi,
  ...ordersApi,
  ...financeApi,
  ...supportApi,
  ...communicationApi,
  ...contentApi,
  ...arbitrationApi,
};
