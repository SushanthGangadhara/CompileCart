import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartStore, WishlistStore, ProductStore } from '../data/storage';
import { useAuth } from './AuthContext';
import { RuleStore } from '../data/storage';
import { parse } from '../compiler/parser';
import { tokenize } from '../compiler/lexer';
import { executeRule } from '../compiler/executor';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const userId = user?.id;

  // Reload cart when user changes
  useEffect(() => {
    if (userId) {
      setCartItems(CartStore.get(userId));
      setWishlistIds(WishlistStore.get(userId));
    } else {
      setCartItems([]);
      setWishlistIds([]);
    }
    setAppliedCoupon(null);
  }, [userId]);

  const refreshCart = useCallback(() => {
    if (userId) setCartItems(CartStore.get(userId));
  }, [userId]);

  // Enrich cart items with product data
  const enrichedCart = cartItems.map(item => {
    const product = ProductStore.findById(item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);

  const subtotal = enrichedCart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalQty = enrichedCart.reduce((s, i) => s + i.quantity, 0);

  // Build context for rule evaluation
  function buildRuleContext(overrideCategory = null) {
    const categories = [...new Set(enrichedCart.map(i => i.product.category))];
    return {
      cart_total: subtotal,
      quantity: totalQty,
      category: overrideCategory || categories[0] || '',
      customer_type: user?.customerType || 'regular',
      coupon: appliedCoupon?.code || '',
      stock: enrichedCart[0]?.product?.stock || 0,
      discount: 0,
      shipping: subtotal > 0 ? 100 : 0,
    };
  }

  // Evaluate all active rules against current cart
  function evaluateRules() {
    const activeRules = RuleStore.getActive();
    let bestDiscount = 0;
    let shipping = subtotal >= 999 ? 0 : 100;
    const applied = [];

    for (const rule of activeRules) {
      try {
        const lexResult = tokenize(rule.source);
        if (lexResult.errors.length > 0) continue;
        const parseResult = parse(lexResult.tokens);
        if (!parseResult.ast) continue;

        // Try each category in cart
        const categories = [...new Set(enrichedCart.map(i => i.product.category))];
        const ctxCategories = categories.length > 0 ? categories : [''];

        for (const cat of ctxCategories) {
          const ctx = buildRuleContext(cat);
          const result = executeRule(parseResult.ast, ctx);
          if (result.conditionMet && result.action) {
            const { target, value } = result.action;
            if (target === 'discount' && value > bestDiscount) {
              bestDiscount = value;
              applied.push({ ruleName: rule.name, action: `${value}% discount`, ruleId: rule.id });
            } else if (target === 'shipping' && value < shipping) {
              shipping = value;
              applied.push({ ruleName: rule.name, action: 'Free shipping', ruleId: rule.id });
            }
          }
        }
      } catch (_) { /* ignore broken rules */ }
    }

    // Coupon on top
    let couponDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percent') couponDiscount = (subtotal * appliedCoupon.value) / 100;
      else if (appliedCoupon.type === 'flat') couponDiscount = appliedCoupon.value;
      else if (appliedCoupon.type === 'shipping') shipping = 0;
    }

    const ruleDiscount = (subtotal * bestDiscount) / 100;
    const totalDiscount = ruleDiscount + couponDiscount;
    const total = Math.max(0, subtotal - totalDiscount + shipping);

    return { bestDiscount, shipping, applied, couponDiscount, ruleDiscount, totalDiscount, total };
  }

  const addToCart = useCallback((productId, quantity = 1) => {
    if (!userId) return { success: false, error: 'Please login to add items to cart.' };
    const product = ProductStore.findById(productId);
    if (!product) return { success: false, error: 'Product not found.' };
    const current = CartStore.get(userId).find(i => i.productId === productId);
    const currentQty = current ? current.quantity : 0;
    if (currentQty + quantity > product.stock) {
      return { success: false, error: `Only ${product.stock - currentQty} left in stock.` };
    }
    CartStore.addItem(userId, productId, quantity);
    setCartItems(CartStore.get(userId));
    return { success: true };
  }, [userId]);

  const removeFromCart = useCallback((productId) => {
    if (!userId) return;
    CartStore.removeItem(userId, productId);
    setCartItems(CartStore.get(userId));
  }, [userId]);

  const updateQty = useCallback((productId, quantity) => {
    if (!userId) return { success: false };
    const product = ProductStore.findById(productId);
    if (product && quantity > product.stock) {
      return { success: false, error: `Only ${product.stock} in stock.` };
    }
    CartStore.updateQty(userId, productId, quantity);
    setCartItems(CartStore.get(userId));
    return { success: true };
  }, [userId]);

  const clearCart = useCallback(() => {
    if (!userId) return;
    CartStore.clear(userId);
    setCartItems([]);
    setAppliedCoupon(null);
  }, [userId]);

  const toggleWishlist = useCallback((productId) => {
    if (!userId) return false;
    const added = WishlistStore.toggle(userId, productId);
    setWishlistIds(WishlistStore.get(userId));
    return added;
  }, [userId]);

  const isInWishlist = useCallback((productId) => {
    if (!userId) return false;
    return wishlistIds.includes(productId);
  }, [userId, wishlistIds]);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      enrichedCart,
      subtotal,
      totalQty,
      cartCount,
      appliedCoupon,
      setAppliedCoupon,
      evaluateRules,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
      toggleWishlist,
      isInWishlist,
      wishlistIds,
      refreshCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
