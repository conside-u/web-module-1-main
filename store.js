const orders = [];

module.exports = {
  getAll: () => orders,
  findById: (id) => orders.find((order) => order.id === id),
  findIndex: (id) => orders.findIndex((order) => order.id === id),
  add: (order) => orders.push(order),
  remove: (index) => orders.splice(index, 1),
  getOrders: () => orders
};