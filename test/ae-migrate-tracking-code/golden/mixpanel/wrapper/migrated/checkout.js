import ta from "thinkingdata-browser";

export function checkout(order) {
  // @tracking purchase
  ta.track("purchase", { order_id: order.id, amount: order.total });
}
