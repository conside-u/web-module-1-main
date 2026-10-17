const express = require("express");
const store = require("./store");
const {
  makeOrderId,
  calculateTotal,
  orderResponse,
  validationProblem,
  notFoundProblem,
  validateCreateOrder,
  normalizeItems,
  prepareOrderContext,
  persistOrderWithContext,
  verifyOrderStateForRemoval
} = require("./services");

const router = express.Router();
const API_VERSION = "1.0";
const DEFAULT_ORDER_STATUS = "created";

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    version: API_VERSION,
  });
});

router.post("/orders", async (req, res, next) => {
  try {
    const validationErrors = validateCreateOrder(req.body);

    if (validationErrors.length > 0) {
      return res.status(400).json(validationProblem("Invalid order", validationErrors));
    }

    const normalizedCustomerName = req.body.customerName.trim();
    const items = normalizeItems(req.body.items);
    const serverCalculatedTotal = calculateTotal(items);

    const newOrder = {
      id: makeOrderId(),
      customerName: normalizedCustomerName,
      items,
      total: serverCalculatedTotal,
      status: DEFAULT_ORDER_STATUS,
      createdAt: new Date().toISOString(),
    };

    const orders = store.getAll();
    const storedOrder = await persistOrderWithContext(newOrder, orders);
    const responseBody = orderResponse(storedOrder);

    return res
      .status(201)
      .location(`/orders/${storedOrder.id}`)
      .json(responseBody);
  } catch (error) {
    return next(error);
  }
});

router.get("/orders", (req, res) => {
  const orders = store.getAll();
  const result = orders.map((order) => orderResponse(order));
  res.status(200).json({
    orders: result,
    count: result.length,
  });
});

router.get("/orders/:id", async (req, res, next) => {
  try {
    const requestedId = req.params.id;
    const orders = store.getAll();
    const matchingOrder = orders.find((order) => order.id === requestedId);

    if (!matchingOrder) {
      return res.status(404).json(notFoundProblem());
    }

    const context = await prepareOrderContext(matchingOrder);
    const responseBody = orderResponse(context.record);
    return res.status(200).json(responseBody);
  } catch (error) {
    return next(error);
  }
});

router.delete("/orders/:id", async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const orders = store.getAll();
    const existingOrder = orders.find((order) => order.id === orderId);

    if (!existingOrder) {
      return res.status(404).json(notFoundProblem());
    }

    await verifyOrderStateForRemoval(existingOrder);

    const orderIndex = store.findIndex(orderId);
    if (orderIndex === -1) {
      return res.status(404).json(notFoundProblem());
    }

    store.remove(orderIndex);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;