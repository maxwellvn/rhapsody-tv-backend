export interface RtvCategory {
  category_id: string;
  category_name: string;
  category_image_link: string;
  day_log: string;
  db_timestamp: string;
}

export interface RtvVideo {
  video_id: string;
  video_title: string;
  description: string;
  thumbnail_link: string;
  db_timestamp: string;
  direct_url?: string;
}

export interface RtvApiResponse<T> {
  status: boolean;
  response: T[];
}

export type RtvCategoryBatch =
  | 'first'
  | 'second'
  | 'third'
  | 'fourth'
  | 'fifth'
  | 'sixth'
  | 'seventh';
