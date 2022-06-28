import { createContext, ReactNode, useContext, useState } from 'react';
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
      const productIndex = cart.findIndex((product) => product.id === productId);
      const { amount: availableAmount }: Stock = await api.get(`stock/${productId}`).then((response) => {
        return response.data;
      });
      const newAmount = productIndex !== -1 ? cart[productIndex].amount + 1 : 1;

      let tempCart: Product[] = [...cart];

      if(availableAmount >= newAmount){
        if(productIndex !== -1){
          tempCart = cart.map((product) => {
            if(product.id === productId){
              return {
                ...product,
                amount: product.amount + 1
              };
            } else {
              return product;
            }
          });
        } else {
          const product: Product = await api.get(`products/${productId}`).then((response) => {
            return {
              ...response.data,
              amount: 1
            };
          });
          tempCart = [...cart, product];
        }

        setCart(tempCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(tempCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex((product) => product.id === productId);

      if(productIndex !== -1){
        const cartWoRemovedProduct = cart.filter((product) => product.id !== productId);
        setCart(cartWoRemovedProduct);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWoRemovedProduct));
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return ;
      }

      const { amount: availableAmount }: Stock = await api.get(`stock/${productId}`).then((response) => {
        return response.data;
      });

      if(availableAmount >= amount){
        const tempCart = cart.map((product) => {
          if(product.id === productId){
            return {
              ...product,
              amount: amount
            }
          } else {
            return product;
          }
        });
        
        setCart(tempCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(tempCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

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
