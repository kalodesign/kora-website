import { getSupabaseAdmin } from "./http.ts";

export type StoreProduct = {
  id: string;
  title: string;
  category: string;
  productType: "dije" | "kit" | "a_medida";
  image: string;
  images: string[];
  description: string;
  size: string;
  material: string;
  price: number;
  compareAt: number;
  stock: number;
  isActive: boolean;
  relatedProductIds: string[];
  components: Array<{ productId: string; quantity: number }>;
  nameOptions: number[];
  tags: string[];
  colorMode: "none" | "global" | "manual";
  colors: ProductColor[];
  availableColors: ProductColor[];
  soldCount: number;
};

export type ProductColor = { name: string; hex: string; image?: string };

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export const normalizeColors = (value: unknown): ProductColor[] => asArray<Record<string, unknown>>(value)
  .map((color) => ({ name: String(color.name || "").trim().slice(0, 40), hex: String(color.hex || "").trim().toUpperCase(), image: String(color.image || "").trim().slice(0, 500) || undefined }))
  .filter((color) => color.name && /^#[0-9A-F]{6}$/.test(color.hex))
  .slice(0, 30);

const mapProduct = (row: Record<string, unknown>): StoreProduct => ({
  id: String(row.id),
  title: String(row.title || ""),
  category: String(row.category || ""),
  productType: ["dije", "kit", "a_medida"].includes(String(row.product_type))
    ? String(row.product_type) as StoreProduct["productType"]
    : "dije",
  image: String(row.image || ""),
  images: [...new Set([String(row.image || ""), ...asArray<string>(row.images)].filter(Boolean))],
  description: String(row.description || ""),
  size: String(row.size || ""),
  material: String(row.material || ""),
  price: Number(row.price || 0),
  compareAt: Number(row.compare_at || 0),
  stock: Number(row.stock || 0),
  isActive: Boolean(row.is_active),
  relatedProductIds: asArray<string>(row.related_product_ids),
  components: asArray<{ productId: string; quantity: number }>(row.components),
  nameOptions: asArray<number>(row.name_options).map(Number).filter((value) => Number.isInteger(value) && value > 0),
  tags: asArray<string>(row.tags),
  colorMode: ["none", "global", "manual"].includes(String(row.color_mode)) ? String(row.color_mode) as StoreProduct["colorMode"] : "none",
  colors: normalizeColors(row.colors),
  availableColors: [],
  soldCount: Math.max(0, Number(row.sold_count || 0))
});

export const getGlobalColors = async () => {
  const { data, error } = await getSupabaseAdmin().from("store_settings").select("value").eq("key", "global_colors").maybeSingle();
  if (error) throw error;
  return normalizeColors(data?.value);
};

export const getStoreProducts = async (includeInactive = false) => {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("store_products").select("*").order("title");
  if (!includeInactive) query = query.eq("is_active", true);
  const [{ data, error }, globalColors] = await Promise.all([query, getGlobalColors()]);
  if (error) throw error;
  return (data || []).map((row) => {
    const product = mapProduct(row as Record<string, unknown>);
    product.availableColors = product.colorMode === "global" ? globalColors : product.colorMode === "manual" ? product.colors : [];
    return product;
  });
};

export const getCatalogProducts = async () => {
  return await getStoreProducts(false);
};

export const normalizeAdminProduct = (source: Record<string, unknown>): StoreProduct => {
  const productType = String(source.productType || "dije");
  const validProductType = ["dije", "kit", "a_medida"].includes(productType) ? productType as StoreProduct["productType"] : "dije";
  const nameOptions = asArray<unknown>(source.nameOptions)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 8);
  const components = asArray<Record<string, unknown>>(source.components)
    .map((item) => ({ productId: String(item.productId || "").trim(), quantity: Math.max(1, Math.floor(Number(item.quantity || 1))) }))
    .filter((item) => item.productId);
  const image = String(source.image || "").trim().slice(0, 500);
  const images = [...new Set([image, ...asArray<unknown>(source.images)
    .map((value) => String(value).trim().slice(0, 500))
    .filter(Boolean)])].slice(0, 8);
  const colorModeValue = String(source.colorMode || "none");
  const colorMode = ["none", "global", "manual"].includes(colorModeValue) ? colorModeValue as StoreProduct["colorMode"] : "none";
  const colors = colorMode === "manual" ? normalizeColors(source.colors) : [];
  return {
    id: String(source.id || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 100),
    title: String(source.title || "").trim().slice(0, 160),
    category: String(source.category || "").trim().slice(0, 80),
    productType: validProductType,
    image,
    images,
    description: String(source.description || "").trim().slice(0, 3000),
    size: String(source.size || "").trim().slice(0, 80),
    material: String(source.material || "").trim().slice(0, 80),
    price: Math.max(0, Math.round(Number(source.price || 0))),
    compareAt: Math.max(0, Math.round(Number(source.compareAt || 0))),
    stock: Math.max(0, Math.floor(Number(source.stock || 0))),
    isActive: source.isActive !== false,
    relatedProductIds: [],
    components: ["kit", "a_medida"].includes(validProductType) ? components : [],
    nameOptions: validProductType === "a_medida" ? [...new Set(nameOptions)].sort((a, b) => a - b) : [],
    tags: asArray<unknown>(source.tags).map((value) => String(value).trim()).filter(Boolean).slice(0, 12),
    colorMode,
    colors,
    availableColors: colors,
    soldCount: Math.max(0, Math.floor(Number(source.soldCount || 0)))
  };
};
