// -----------------------------------------------------------------------------
// AL-MEYAR — Grand Tour (executable end-to-end integration test)
//
// Drives the SERVICE LAYER end-to-end over the LOCAL (localStorage) adapter —
// no Supabase env is set, so isSupabaseConfigured is false and every service
// resolves through its localStorage-backed adapter. jsdom provides
// window.localStorage; we clear it before each test so the run is deterministic.
//
// The journey:
//   1. sign up + sign in a customer
//   2. the seeded catalog loads
//   3. an admin (email in the default VITE_ADMIN_EMAILS) creates a product
//   4. payment: success card succeeds, decline card fails
//   5. the customer places an order (status Received)
//   6. the admin advances it through the full lifecycle -> Delivered
//   7. the admin attaches a tracking number; trackById reflects Delivered
//   8. hasPurchased(productId) is true for the customer
// -----------------------------------------------------------------------------

import { beforeEach, describe, it, expect } from "vitest";

import * as authService from "../services/authService";
import * as productsService from "../services/productsService";
import * as ordersService from "../services/ordersService";
import * as paymentService from "../services/paymentService";

// Mirror OrdersContext.hasPurchased over the service layer (the context wraps
// the same listOrders + item scan; we assert the underlying truth here).
async function hasPurchased(userId, productId) {
  const orders = await ordersService.listOrders(userId);
  return orders.some((o) =>
    (o.items || []).some((it) => String(it.id) === String(productId))
  );
}

describe("Cabler Parts — Grand Tour (LOCAL adapter, service layer)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("runs the full customer + admin lifecycle end-to-end", async () => {
    // -- 1. sign up + sign in a customer --------------------------------------
    const customerEmail = "buyer@example.com";
    const customerPassword = "hunter2!";

    const signUpRes = await authService.signUp({
      name: "Buyer One",
      email: customerEmail,
      password: customerPassword,
    });
    expect(signUpRes.ok).toBe(true);
    expect(signUpRes.user).toBeTruthy();
    expect(signUpRes.user.role).toBe("user");
    const customerId = signUpRes.user.id;

    const signInRes = await authService.signIn(customerEmail, customerPassword);
    expect(signInRes.ok).toBe(true);
    expect(signInRes.user.id).toBe(customerId);

    // -- 2. the seeded catalog loads -----------------------------------------
    const seeded = await productsService.listProducts();
    expect(Array.isArray(seeded)).toBe(true);
    expect(seeded.length).toBeGreaterThan(0);
    const seededCount = seeded.length;
    const firstProduct = seeded[0];
    expect(firstProduct.id).toBeTruthy();

    // -- 3. admin signs up + creates a product -------------------------------
    // The default VITE_ADMIN_EMAILS is "admin@cablerparts.com", so this account
    // is granted the admin role by the LOCAL auth adapter.
    const adminEmail = "admin@cablerparts.com";
    const adminPassword = "control123";

    const adminSignUp = await authService.signUp({
      name: "Store Admin",
      email: adminEmail,
      password: adminPassword,
    });
    expect(adminSignUp.ok).toBe(true);
    expect(adminSignUp.user.role).toBe("admin");

    const newProduct = await productsService.createProduct({
      name: "Test Brake Disc",
      nameAr: "قرص مكابح اختباري",
      brand: "Cabler Parts",
      priceUSD: 120,
      category: "Braking",
      fitment: ["Toyota"],
      stock: 9,
    });
    expect(newProduct.id).toBeTruthy();

    const afterCreate = await productsService.listProducts();
    expect(afterCreate.length).toBe(seededCount + 1);
    expect(afterCreate.some((p) => p.id === newProduct.id)).toBe(true);

    // -- 4. payment: success card ok, decline card not ok --------------------
    const okPayment = await paymentService.createPayment({
      amountUSD: 120,
      currency: "USD",
      card: {
        number: "4242424242424242",
        expiry: "12/30",
        cvc: "123",
        name: "Buyer One",
      },
    });
    expect(okPayment.ok).toBe(true);
    expect(okPayment.id).toBeTruthy();
    expect(okPayment.status).toBe("paid");

    const declined = await paymentService.createPayment({
      amountUSD: 120,
      currency: "USD",
      card: {
        number: "4000000000000002",
        expiry: "12/30",
        cvc: "123",
        name: "Buyer One",
      },
    });
    expect(declined.ok).toBe(false);
    expect(declined.error).toBe("card_declined");

    // -- 5. the customer places an order (status Received) -------------------
    const placed = await ordersService.placeOrder({
      userId: customerId,
      items: [
        {
          id: newProduct.id,
          name: newProduct.name,
          nameAr: newProduct.nameAr,
          qty: 1,
          priceUSD: newProduct.priceUSD,
        },
      ],
      subtotalUSD: 120,
      discountUSD: 0,
      shippingUSD: 0,
      totalUSD: 120,
      contact: { name: "Buyer One", email: customerEmail, phone: "+966500000000" },
      shipping: { address: "1 Test St", city: "Riyadh", regionCode: "SA" },
      paymentId: okPayment.id,
    });
    expect(placed.id).toMatch(/^MR-/);
    expect(placed.status).toBe("Received");
    expect(placed.userId).toBe(customerId);
    expect(placed.paymentId).toBe(okPayment.id);
    expect(Array.isArray(placed.statusHistory)).toBe(true);
    expect(placed.statusHistory[0].status).toBe("Received");
    // new fulfilment metadata fields default to null
    expect(placed.trackingNumber).toBe(null);
    expect(placed.shippingMethod).toBe(null);

    // the order shows up in the customer's order list
    const customerOrders = await ordersService.listOrders(customerId);
    expect(customerOrders.some((o) => o.id === placed.id)).toBe(true);

    // -- 6. admin advances through the full lifecycle ------------------------
    const adminView = await ordersService.getAllOrders();
    expect(adminView.some((o) => o.id === placed.id)).toBe(true);

    const lifecycle = [
      "PaymentConfirmed",
      "Processing",
      "Packed",
      "Shipped",
      "OutForDelivery",
      "Delivered",
    ];
    let advanced;
    for (const next of lifecycle) {
      advanced = await ordersService.updateOrderStatus(placed.id, next);
      expect(advanced.status).toBe(next);
    }
    // history accumulated every stage, starting from Received
    expect(advanced.statusHistory.map((h) => h.status)).toEqual([
      "Received",
      ...lifecycle,
    ]);
    // reaching Delivered stamps the actual delivery date
    expect(typeof advanced.actualDeliveryDate).toBe("number");

    // -- 7. admin attaches tracking; record reflects Delivered ---------------
    const withTracking = await ordersService.updateOrderFields(placed.id, {
      trackingNumber: "ARM12345",
      courierProvider: "Aramex",
      shippingMethod: "standard",
    });
    expect(withTracking.trackingNumber).toBe("ARM12345");
    expect(withTracking.courierProvider).toBe("Aramex");

    const tracked = await ordersService.trackById(placed.id);
    expect(tracked.found).toBe(true);
    expect(tracked.isDemo).toBe(false);
    expect(tracked.order.status).toBe("Delivered");
    expect(tracked.order.trackingNumber).toBe("ARM12345");

    const fetched = await ordersService.getOrder(placed.id, customerId);
    expect(fetched.status).toBe("Delivered");

    // -- 8. hasPurchased(productId) is true for the customer -----------------
    expect(await hasPurchased(customerId, newProduct.id)).toBe(true);
    expect(await hasPurchased(customerId, "non-existent-id")).toBe(false);

    // sign the customer back out — clean exit
    await authService.signOut();
    expect(await authService.getCurrentUser()).toBe(null);
  });

  it("trackById returns a deterministic demo order for an unknown id", async () => {
    const a = await ordersService.trackById("MR-UNKNOWN-XYZ");
    const b = await ordersService.trackById("MR-UNKNOWN-XYZ");
    expect(a.found).toBe(false);
    expect(a.isDemo).toBe(true);
    expect(a.order).toBeTruthy();
    // deterministic: the same id yields the same demo status every time
    expect(a.order.status).toBe(b.order.status);
  });

  it("rejects an invalid card at the payment layer", async () => {
    const res = await paymentService.createPayment({
      amountUSD: 50,
      currency: "USD",
      card: { number: "1234", expiry: "12/30", cvc: "123", name: "x" },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid_card");
  });
});
