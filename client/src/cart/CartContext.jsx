import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const STORAGE_KEY = 'cart';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

// The cart lives only in the browser (React state + localStorage); no database table.
// Each item: { product_id, name, unit_price, min_order_qty, stock_quantity, quantity }
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = (product, quantity) =>
    setItems((current) => {
      const existing = current.find((i) => i.product_id === product.product_id);
      if (existing) {
        return current.map((i) => (i.product_id === product.product_id ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [
        ...current,
        {
          product_id: product.product_id,
          name: product.name,
          unit_price: product.unit_price,
          min_order_qty: product.min_order_qty,
          stock_quantity: product.stock_quantity,
          quantity,
        },
      ];
    });

  const setQuantity = (productId, quantity) =>
    setItems((current) => current.map((i) => (i.product_id === productId ? { ...i, quantity } : i)));
  const remove = (productId) => setItems((current) => current.filter((i) => i.product_id !== productId));
  const clear = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  return <CartContext.Provider value={{ items, add, setQuantity, remove, clear, total }}>{children}</CartContext.Provider>;
}
