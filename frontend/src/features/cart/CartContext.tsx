import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Product, CartItem, CheckoutPreview } from '../../lib/types';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { planCartMerge, type LocalCartItem, type ServerCartItem } from './mergeCart';

const LOCAL_STORAGE_KEY = 'langmoc.cart.v1';

export interface DisplayCartItem {
  id: string; // product_id
  slug: string;
  name: string;
  image: string;
  price: number | null;
  quantity: number;
  stock_quantity: number;
  origin?: string | null;
  price_is_demo?: boolean;
}

interface CartContextType {
  items: DisplayCartItem[];
  totalQuantity: number;
  subtotal: number;
  preview: CheckoutPreview | null;
  appliedPromo: string | null;
  loading: boolean;
  rowLoading: Record<string, boolean>;
  error: string | null;
  clearError: () => void;
  addToCart: (product: Product, quantity?: number) => Promise<boolean>;
  updateQuantity: (productId: string, newQuantity: number) => Promise<boolean>;
  removeFromCart: (productId: string) => Promise<void>;
  applyPromotion: (code: string) => Promise<boolean>;
  removePromotion: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readLocalCart(): LocalCartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(x => x && typeof x.id === 'string' && typeof x.name === 'string' && Number.isInteger(x.quantity) && x.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: LocalCartItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Không ghi được localStorage
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<DisplayCartItem[]>([]);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const prevUserRef = useRef<string | null>(null);

  const clearError = () => setError(null);

  // Helper tính subtotal
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Gọi preview giá từ server (chỉ khi đã đăng nhập)
  const fetchPreview = useCallback(async (promoCode?: string | null) => {
    if (!user) {
      setPreview(null);
      return;
    }
    try {
      const res = await api.checkoutPreview({
        promotion_code: promoCode || undefined,
        payment_method: 'cod'
      });
      setPreview(res.data);
    } catch {
      // Giữ preview cũ hoặc null nếu lỗi
    }
  }, [user]);

  // Load giỏ hàng từ server hoặc local
  const loadCart = useCallback(async () => {
    setLoading(true);
    if (user) {
      try {
        const res = await api.cart();
        const serverItems: DisplayCartItem[] = res.data.items.map(s => ({
          id: s.product_id,
          slug: s.product_slug,
          name: s.product_name,
          image: s.image_url,
          price: s.price_vnd,
          quantity: s.quantity,
          stock_quantity: s.stock_quantity ?? 8,
          origin: s.origin,
          price_is_demo: s.price_is_demo
        }));
        setItems(serverItems);
        await fetchPreview(appliedPromo);
      } catch (err) {
        if (err instanceof ApiError) setError(err.message);
      }
    } else {
      // Chưa đăng nhập: không lưu giỏ vãng lai
      setItems([]);
      setPreview(null);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // bỏ qua nếu browser chặn localStorage
      }
    }
    setLoading(false);
  }, [user, appliedPromo, fetchPreview]);

  // Đồng bộ gộp giỏ khi người dùng đăng nhập
  useEffect(() => {
    const currentUserId = user?.id || null;
    const isLoggingIn = !prevUserRef.current && currentUserId;
    const isLoggingOut = prevUserRef.current && !currentUserId;
    prevUserRef.current = currentUserId;

    if (isLoggingOut) {
      // Logout: xóa giỏ trên giao diện, giỏ trên server vẫn nguyên vẹn
      setItems([]);
      setPreview(null);
      setAppliedPromo(null);
      return;
    }

    if (isLoggingIn) {
      const executeMerge = async () => {
        setLoading(true);
        const local = readLocalCart();
        if (local.length === 0) {
          await loadCart();
          return;
        }

        try {
          // 1. GET /me/cart trước
          const serverRes = await api.cart();
          const serverCart = serverRes.data.items;

          // 2. Tính toán kế hoạch gộp giỏ bằng hàm thuần
          const plan = planCartMerge(local, serverCart);

          const failedIds: string[] = [];
          // 3. PUT từng món theo targetQuantity đã tính
          for (const itemPlan of plan.itemsToPut) {
            try {
              await api.updateCartItem(itemPlan.productId, itemPlan.targetQuantity);
            } catch (putErr) {
              failedIds.push(itemPlan.productId);
            }
          }

          // Món nào bị lỗi hoặc bị blocked thì GIỮ LẠI trong localStorage
          const unmergedItems = local.filter(l =>
            failedIds.includes(l.id) || plan.blockedItems.some(b => b.item.id === l.id)
          );

          if (unmergedItems.length === 0) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          } else {
            writeLocalCart(unmergedItems);
            setError(`Đã gộp giỏ hàng. Một số món chưa thể gộp do vượt tồn kho hoặc lỗi mạng.`);
          }

          // 4. Đồng bộ lại giỏ hàng từ server
          await loadCart();
        } catch {
          setError('Chưa thể đồng bộ giỏ hàng từ trình duyệt lên tài khoản.');
          await loadCart();
        } finally {
          setLoading(false);
        }
      };

      executeMerge();
    } else {
      loadCart();
    }
  }, [user, loadCart]);

  // Thêm vào giỏ (Yêu cầu đăng nhập)
  const addToCart = async (product: Product, quantity = 1): Promise<boolean> => {
    setError(null);
    if (!product || quantity <= 0) return false;

    if (!user) {
      setError('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      const currentPath = window.location.hash.replace(/^#/, '') || '/';
      window.location.hash = `#/login?redirect=${encodeURIComponent(currentPath)}`;
      return false;
    }

    // Đã đăng nhập: gọi PUT lên server
    const existing = items.find(i => i.id === product.id);
    const newQty = (existing ? existing.quantity : 0) + quantity;

    setRowLoading(prev => ({ ...prev, [product.id]: true }));
    try {
      await api.updateCartItem(product.id, newQty);
      await loadCart();
      return true;
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Không thể thêm sản phẩm vào giỏ hàng.');
      return false;
    } finally {
      setRowLoading(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // Cập nhật số lượng (có debounce + rollback nếu lỗi)
  const updateQuantity = async (productId: string, newQuantity: number): Promise<boolean> => {
    if (newQuantity <= 0) {
      await removeFromCart(productId);
      return true;
    }

    const previousItems = [...items];
    const targetItem = items.find(i => i.id === productId);
    if (!targetItem) return false;

    // Optimistic update
    setItems(prev => prev.map(i => i.id === productId ? { ...i, quantity: newQuantity } : i));

    if (!user) {
      // Guest: Lưu localStorage ngay
      const local = readLocalCart().map(i => i.id === productId ? { ...i, quantity: newQuantity } : i);
      writeLocalCart(local);
      return true;
    }

    // Authenticated: Debounce 350ms trước khi bắn API PUT
    if (debounceTimers.current[productId]) {
      clearTimeout(debounceTimers.current[productId]);
    }

    return new Promise(resolve => {
      debounceTimers.current[productId] = setTimeout(async () => {
        setRowLoading(prev => ({ ...prev, [productId]: true }));
        try {
          await api.updateCartItem(productId, newQuantity);
          await fetchPreview(appliedPromo);
          resolve(true);
        } catch (err) {
          // Rollback nếu API lỗi (như vượt tồn kho 409)
          setItems(previousItems);
          if (err instanceof ApiError) setError(err.message);
          else setError('Không thể cập nhật số lượng.');
          resolve(false);
        } finally {
          setRowLoading(prev => ({ ...prev, [productId]: false }));
        }
      }, 350);
    });
  };

  // Xóa món khỏi giỏ
  const removeFromCart = async (productId: string): Promise<void> => {
    if (!user) {
      const local = readLocalCart().filter(i => i.id !== productId);
      writeLocalCart(local);
      setItems(prev => prev.filter(i => i.id !== productId));
      return;
    }

    setRowLoading(prev => ({ ...prev, [productId]: true }));
    try {
      await api.removeCartItem(productId);
      setItems(prev => prev.filter(i => i.id !== productId));
      await fetchPreview(appliedPromo);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Không thể xóa sản phẩm khỏi giỏ hàng.');
    } finally {
      setRowLoading(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Áp dụng khuyến mãi
  const applyPromotion = async (code: string): Promise<boolean> => {
    setError(null);
    if (!user) {
      setError('Vui lòng đăng nhập để áp dụng mã giảm giá.');
      return false;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return false;

    try {
      const res = await api.checkoutPreview({
        promotion_code: cleanCode,
        payment_method: 'cod'
      });
      setPreview(res.data);
      setAppliedPromo(cleanCode);
      return true;
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Không thể áp dụng mã giảm giá.');
      return false;
    }
  };

  // Hủy khuyến mãi
  const removePromotion = async (): Promise<void> => {
    setError(null);
    setAppliedPromo(null);
    if (user) {
      await fetchPreview(null);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        subtotal,
        preview,
        appliedPromo,
        loading,
        rowLoading,
        error,
        clearError,
        addToCart,
        updateQuantity,
        removeFromCart,
        applyPromotion,
        removePromotion,
        refreshCart: loadCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được sử dụng bên trong CartProvider');
  }
  return context;
}
