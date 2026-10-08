export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  categoryLabel: string;
  productType: string;
  price: number;
  priceMax?: number;
  priceRangeLabel?: string;
  originalPrice?: number;
  installmentText?: string;
  badge?: string;
  rating?: number;
  reviewCount?: number;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  specifications: Record<string, string>;
  dimensions?: {
    width: string;
    height: string;
    depth: string;
    weight: string;
  };
  images: string[];
  availableVoltages?: string[];
  highlight?: boolean;
  buyUrl?: string;
  platform?: string;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductCategory = string;

export interface CategoryInfo {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  imageUrl: string;
  productCount: number;
}

export type SortOption =
  | 'relevance'
  | 'rating'
  | 'newest'
  | 'name-asc';

