// Logic gộp giỏ hàng (Pure function) giữa LocalStorage và Server Cart
// Tuân thủ 100% nghiệp vụ: Không ghi đè số lượng, tính toán theo tồn kho, bảo toàn dữ liệu khi có lỗi.

export interface LocalCartItem {
  id: string; // Product UUID
  slug: string;
  name: string;
  image: string;
  price: number | null;
  quantity: number;
  price_is_demo?: boolean;
  origin?: string | null;
}

export interface ServerCartItem {
  product_id: string;
  product_slug: string;
  product_name: string;
  image_url: string;
  price_vnd: number | null;
  quantity: number;
  stock_quantity?: number;
  origin?: string | null;
  price_is_demo?: boolean;
}

export interface MergePlanItem {
  productId: string;
  serverCurrentQty: number;
  localAddQty: number;
  targetQuantity: number;
  cappedByStock: boolean;
  item: LocalCartItem;
}

export interface MergePlan {
  itemsToPut: MergePlanItem[];
  blockedItems: { item: LocalCartItem; reason: string }[];
}

/**
 * Hàm thuần tính toán kế hoạch gộp giỏ:
 * - Đối với mỗi món local: targetQuantity = serverQuantity + localQuantity
 * - Không bao giờ vượt quá tồn kho (stock)
 * - Trả về danh sách cần gọi PUT và danh sách các món bị chặn/lỗi tồn kho
 */
export function planCartMerge(
  localCart: LocalCartItem[],
  serverCart: ServerCartItem[],
  stockLookup: Record<string, number> = {}
): MergePlan {
  const itemsToPut: MergePlanItem[] = [];
  const blockedItems: { item: LocalCartItem; reason: string }[] = [];

  if (!Array.isArray(localCart) || localCart.length === 0) {
    return { itemsToPut, blockedItems };
  }

  const safeServer = Array.isArray(serverCart) ? serverCart : [];

  for (const localItem of localCart) {
    if (!localItem || !localItem.id || typeof localItem.quantity !== 'number' || localItem.quantity <= 0) {
      continue;
    }

    const existingServer = safeServer.find(s => s.product_id === localItem.id);
    const serverCurrentQty = existingServer ? existingServer.quantity : 0;

    // Xác định tồn kho tối đa (mặc định 99 nếu không cung cấp)
    const maxStock = stockLookup[localItem.id] !== undefined
      ? stockLookup[localItem.id]
      : (existingServer?.stock_quantity ?? 99);

    if (maxStock <= 0) {
      blockedItems.push({
        item: localItem,
        reason: 'Sản phẩm đã hết hàng trong kho.'
      });
      continue;
    }

    if (serverCurrentQty >= maxStock) {
      blockedItems.push({
        item: localItem,
        reason: `Số lượng trên giỏ hàng đã đạt giới hạn tồn kho tối đa (${maxStock} món).`
      });
      continue;
    }

    const desiredTotal = serverCurrentQty + localItem.quantity;
    const capped = desiredTotal > maxStock;
    const targetQuantity = capped ? maxStock : desiredTotal;

    itemsToPut.push({
      productId: localItem.id,
      serverCurrentQty,
      localAddQty: localItem.quantity,
      targetQuantity,
      cappedByStock: capped,
      item: localItem
    });
  }

  return { itemsToPut, blockedItems };
}
