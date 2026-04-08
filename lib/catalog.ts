export const PRODUCT_CATEGORY_OPTIONS = [
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "FASHION", label: "Fashion" },
  { value: "HOME", label: "Home" },
  { value: "BEAUTY", label: "Beauty" },
  { value: "LIFESTYLE", label: "Lifestyle" },
  { value: "OTHER", label: "Other" },
] as const;

export type CatalogCategoryFilter =
  | (typeof PRODUCT_CATEGORY_OPTIONS)[number]["value"]
  | "ALL";

export const PRODUCT_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name_asc", label: "Name: A to Z" },
] as const;

export type CatalogSortOption =
  (typeof PRODUCT_SORT_OPTIONS)[number]["value"];

export function getCategoryLabel(value: string) {
  return (
    PRODUCT_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}
