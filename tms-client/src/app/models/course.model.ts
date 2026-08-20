export interface Course {
  id: number;
  code: string;
  title: string;
  maxCapacity: number;
  enrollmentCount: number;
  status?: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CourseLink {
  href: string;
  rel: string;
  method: string;
}

export interface CourseDetail extends Course {
  links: readonly CourseLink[];
}
