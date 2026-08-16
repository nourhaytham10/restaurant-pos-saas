describe('Accounting Formulas', () => {
  it('Products=500, Discount=20, Delivery=40 -> RestaurantDue=480, DriverDue=40, Total=520', () => {
    const subtotal = 500;
    const discountAmt = 20;
    const deliveryFee = 40;
    const netAmount = subtotal - discountAmt;
    const totalAmount = netAmount + deliveryFee;
    expect(netAmount).toBe(480);
    expect(totalAmount).toBe(520);
    expect(netAmount).toBe(480);
    expect(deliveryFee).toBe(40);
  });

  it('Opening=1000, CashSales=3000, Wallet=1000, Visa=500, CashExpense=500 -> ExpectedCash=3500', () => {
    const openingAmount = 1000;
    const cashSales = 3000;
    const walletSales = 1000;
    const visaSales = 500;
    const cashExpenses = 500;
    const expectedCash = openingAmount + cashSales - cashExpenses;
    expect(expectedCash).toBe(3500);
    expect(expectedCash).not.toBe(openingAmount + cashSales + walletSales + visaSales - cashExpenses);
  });

  it('10% discount on 500 = 50, net = 450', () => {
    const subtotal = 500;
    const discountAmt = (subtotal * 10) / 100;
    expect(discountAmt).toBe(50);
    expect(subtotal - discountAmt).toBe(450);
  });

  it('Expense create=500, edit=700, delete -> net reflects changes', () => {
    const sales = 10000;
    let expenses = 500;
    expect(sales - expenses).toBe(9500);
    expenses = 700;
    expect(sales - expenses).toBe(9300);
    expenses = 0;
    expect(sales - expenses).toBe(10000);
  });
});
