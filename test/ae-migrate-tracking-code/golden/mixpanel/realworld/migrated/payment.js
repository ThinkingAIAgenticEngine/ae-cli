import ta from "thinkingdata-browser";

export function trackPurchase(order) {
  // @tracking purchase
  ta.track("purchase", { order_id: order.id, amount: order.total });
}
