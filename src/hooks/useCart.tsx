import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // debugger
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

      const findProduct = cart.find(item => item.id === productId);
      const productAmount = findProduct?.amount || 0;

      if (productStock.amount < (productAmount + 1)) {
        toast.error('Quantidade solicitada fora de estoque');
        
        return;
      }

      let updatedCart: Product[] = [];

      if (!findProduct) {
        const { data: product } = await api.get<Product>(`/products/${productId}`);

        const parsedProduct = Object.assign(product, { amount: 1 });

        updatedCart = [...cart, parsedProduct];
      } else {
        updatedCart = cart.map(item => item.id === findProduct.id ? 
          { 
            ...item, 
            amount: item.amount + 1 
          } : item);
      }
    
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const findProduct = cart.find(item => item.id === productId);

      if (!findProduct) {
        toast.error('Erro na remoção do produto');

        return;
      } 

      const updatedCart = cart.filter(item => item.id !== productId);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stockData } = await api.get<Stock>(`/stock/${productId}`);

      if (amount < 1 ) {
        return;
      }

      if (amount > stockData.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(item => item.id === productId ? {
        ...item,
        amount
      } : item);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  useEffect(() => {
    // console.log(cart);
  }, [cart])

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
