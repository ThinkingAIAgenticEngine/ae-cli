import ta from "thinkingdata-browser";

export function addToCart(item) {
  // @tracking add_to_cart
  ta.track("add_to_cart", { item_id: item.id, price: item.price, quantity: item.qty });
}
