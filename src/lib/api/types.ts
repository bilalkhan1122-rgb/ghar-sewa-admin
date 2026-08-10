export type BackendRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type VerificationStatus = 'INCOMPLETE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'BANNED';

export type City = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: BackendRole;
  cityId: string;
  address: string | null;
  status: UserStatus;
  profileCompleted: boolean;
  verificationStatus: VerificationStatus;
  isActive: boolean;
  profilePhoto: string | null;
  walletBalance: string;
  totalSpent: string;
  totalTopups: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResult = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type PaginatedUsers = Paginated<User>;

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};
