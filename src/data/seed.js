/**
 * seed.js — Initial demo data for the Smart E-Commerce Platform
 */
import { UserStore, ProductStore, CouponStore, RuleStore, Store, KEYS, generateId } from './storage';

export function initSeedData() {
  if (Store.get(KEYS.INITIALIZED)) return;

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [
    {
      id: 'admin-001',
      name: 'Admin User',
      email: 'admin@shopdemo.com',
      password: 'Admin@123',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00.000Z',
      phone: '9876543210',
      addresses: [],
    },
    {
      id: 'cust-001',
      name: 'Demo Customer',
      email: 'user@shopdemo.com',
      password: 'User@123',
      role: 'customer',
      customerType: 'premium',
      createdAt: '2024-01-05T00:00:00.000Z',
      phone: '9876543211',
      addresses: [
        {
          id: 'addr-001',
          label: 'Home',
          line1: '123 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
          isDefault: true,
        },
      ],
    },
  ];
  UserStore.save(users);

  // ── Products ───────────────────────────────────────────────────────────────
  const products = [
    // Electronics
    { id: 'p001', name: 'Samsung Galaxy S24', category: 'Electronics', brand: 'Samsung', price: 74999, originalPrice: 84999, stock: 25, rating: 4.5, reviews: 128, image: '📱', description: 'Latest Samsung flagship with 200MP camera, Snapdragon 8 Gen 3 processor, and 5000mAh battery.', featured: true },
    { id: 'p002', name: 'Apple MacBook Air M2', category: 'Electronics', brand: 'Apple', price: 114900, originalPrice: 119900, stock: 10, rating: 4.8, reviews: 95, image: '💻', description: 'Ultra-thin MacBook with Apple M2 chip, 8GB RAM, 256GB SSD, and 18-hour battery life.', featured: true },
    { id: 'p003', name: 'Sony WH-1000XM5', category: 'Electronics', brand: 'Sony', price: 24990, originalPrice: 29990, stock: 40, rating: 4.7, reviews: 210, image: '🎧', description: 'Industry-leading noise cancelling wireless headphones with 30-hour battery and crystal-clear calls.', featured: false },
    { id: 'p004', name: 'LG 55" OLED TV', category: 'Electronics', brand: 'LG', price: 89999, originalPrice: 109999, stock: 8, rating: 4.6, reviews: 67, image: '📺', description: '55-inch OLED TV with 4K resolution, HDR10, Dolby Vision, and webOS smart platform.', featured: true },
    { id: 'p005', name: 'iPad Pro 12.9"', category: 'Electronics', brand: 'Apple', price: 109900, originalPrice: 119900, stock: 15, rating: 4.7, reviews: 83, image: '📱', description: 'M2 chip, Liquid Retina XDR display, Thunderbolt port, and ProRes video support.', featured: false },
    { id: 'p006', name: 'Canon EOS R50', category: 'Electronics', brand: 'Canon', price: 64990, originalPrice: 74990, stock: 12, rating: 4.4, reviews: 45, image: '📷', description: 'Mirrorless camera with 24.2MP sensor, 4K video, dual pixel autofocus, and compact design.', featured: false },
    // Fashion
    { id: 'p007', name: 'Levi\'s 511 Slim Jeans', category: 'Fashion', brand: 'Levi\'s', price: 2999, originalPrice: 3999, stock: 60, rating: 4.3, reviews: 320, image: '👖', description: 'Slim fit jeans in stretch denim for all-day comfort. Available in multiple washes.', featured: false },
    { id: 'p008', name: 'Nike Air Max 270', category: 'Fashion', brand: 'Nike', price: 9995, originalPrice: 12995, stock: 35, rating: 4.5, reviews: 189, image: '👟', description: 'Lifestyle shoe with the largest Max Air unit yet. Mesh upper for breathability.', featured: true },
    { id: 'p009', name: 'Allen Solly Formal Shirt', category: 'Fashion', brand: 'Allen Solly', price: 1499, originalPrice: 2299, stock: 80, rating: 4.2, reviews: 145, image: '👔', description: 'Premium cotton formal shirt with slim fit. Perfect for office and semi-formal occasions.', featured: false },
    { id: 'p010', name: 'H&M Winter Jacket', category: 'Fashion', brand: 'H&M', price: 3999, originalPrice: 5499, stock: 20, rating: 4.1, reviews: 78, image: '🧥', description: 'Warm padded jacket with hood, zippered pockets, and ribbed cuffs. Water-resistant coating.', featured: false },
    // Home & Kitchen
    { id: 'p011', name: 'Instant Pot Duo 7-in-1', category: 'Home & Kitchen', brand: 'Instant Pot', price: 8999, originalPrice: 11999, stock: 30, rating: 4.6, reviews: 267, image: '🍲', description: 'Pressure cooker, slow cooker, rice cooker, steamer, sauté, yogurt maker, and food warmer.', featured: true },
    { id: 'p012', name: 'Dyson V15 Vacuum', category: 'Home & Kitchen', brand: 'Dyson', price: 54900, originalPrice: 64900, stock: 7, rating: 4.7, reviews: 112, image: '🧹', description: 'Laser detects invisible dust. HEPA filtration, 60-minute runtime, and powerful suction.', featured: false },
    { id: 'p013', name: 'Philips Air Fryer XXL', category: 'Home & Kitchen', brand: 'Philips', price: 12999, originalPrice: 15999, stock: 22, rating: 4.5, reviews: 198, image: '🍟', description: '6.2L capacity air fryer with fat removal technology. Cook for the whole family.', featured: false },
    { id: 'p014', name: 'IKEA KALLAX Shelf Unit', category: 'Home & Kitchen', brand: 'IKEA', price: 6999, originalPrice: 7999, stock: 15, rating: 4.3, reviews: 89, image: '🪑', description: 'Versatile shelf unit with 4 compartments. Use it as room divider, TV bench, or bookcase.', featured: false },
    // Books
    { id: 'p015', name: 'Clean Code - Robert Martin', category: 'Books', brand: 'Prentice Hall', price: 899, originalPrice: 1299, stock: 100, rating: 4.8, reviews: 512, image: '📚', description: 'A handbook of agile software craftsmanship. Essential reading for every developer.', featured: false },
    { id: 'p016', name: 'System Design Interview', category: 'Books', brand: 'ByteByteGo', price: 1299, originalPrice: 1799, stock: 75, rating: 4.7, reviews: 367, image: '📖', description: 'An insider\'s guide to system design interviews with 16 real-world design problems.', featured: false },
    // Sports
    { id: 'p017', name: 'Yonex Badminton Racket', category: 'Sports', brand: 'Yonex', price: 4999, originalPrice: 6499, stock: 45, rating: 4.4, reviews: 156, image: '🏸', description: 'Professional-grade carbon fiber badminton racket. Lightweight with high tension string.', featured: false },
    { id: 'p018', name: 'Decathlon Gym Gloves', category: 'Sports', brand: 'Decathlon', price: 699, originalPrice: 999, stock: 120, rating: 4.2, reviews: 234, image: '🧤', description: 'Breathable training gloves with palm padding for weightlifting and cross-training.', featured: false },
    // Beauty
    { id: 'p019', name: 'Lakme Absolute Foundation', category: 'Beauty', brand: 'Lakme', price: 649, originalPrice: 799, stock: 90, rating: 4.1, reviews: 445, image: '💄', description: 'Full coverage liquid foundation with SPF 15. Lasts up to 16 hours. 12 shades.', featured: false },
    // Toys
    { id: 'p020', name: 'LEGO Technic Set 42130', category: 'Toys', brand: 'LEGO', price: 9999, originalPrice: 12999, stock: 18, rating: 4.6, reviews: 88, image: '🧱', description: '1000-piece Technic set with motorized functions. Builds a realistic off-road vehicle.', featured: true },
  ];
  ProductStore.save(products);

  // ── Coupons ────────────────────────────────────────────────────────────────
  const coupons = [
    { id: 'coup-001', code: 'WELCOME10', type: 'percent', value: 10, minOrder: 500, description: '10% off on first order', active: true },
    { id: 'coup-002', code: 'SAVE500', type: 'flat', value: 500, minOrder: 3000, description: '₹500 off on orders above ₹3000', active: true },
    { id: 'coup-003', code: 'TECH15', type: 'percent', value: 15, minOrder: 10000, description: '15% off on Electronics above ₹10000', category: 'Electronics', active: true },
    { id: 'coup-004', code: 'FASHION20', type: 'percent', value: 20, minOrder: 2000, description: '20% off on Fashion items', category: 'Fashion', active: true },
    { id: 'coup-005', code: 'FREESHIP', type: 'shipping', value: 100, minOrder: 999, description: 'Free shipping on orders above ₹999', active: true },
  ];
  CouponStore.save(coupons);

  // ── Business Rules ─────────────────────────────────────────────────────────
  const rules = [
    {
      id: 'rule-001',
      name: 'Electronics Big Discount',
      source: 'IF cart_total > 5000 AND category = "Electronics"\nTHEN discount = 20',
      description: '20% discount on Electronics orders above ₹5000',
      compiled: true,
      active: true,
      createdAt: '2024-01-10T00:00:00.000Z',
      compiledAt: '2024-01-10T00:05:00.000Z',
      action: { type: 'discount', value: 20 },
      compilationResult: { success: true, errors: [], warnings: [] },
    },
    {
      id: 'rule-002',
      name: 'Bulk Purchase Discount',
      source: 'IF quantity >= 3 AND cart_total > 2000\nTHEN discount = 15',
      description: '15% discount when buying 3+ items above ₹2000',
      compiled: true,
      active: true,
      createdAt: '2024-01-11T00:00:00.000Z',
      compiledAt: '2024-01-11T00:05:00.000Z',
      action: { type: 'discount', value: 15 },
      compilationResult: { success: true, errors: [], warnings: [] },
    },
    {
      id: 'rule-003',
      name: 'Premium Customer Offer',
      source: 'IF customer_type = "premium" AND cart_total > 1000\nTHEN discount = 10',
      description: '10% discount for premium customers on orders above ₹1000',
      compiled: true,
      active: true,
      createdAt: '2024-01-12T00:00:00.000Z',
      compiledAt: '2024-01-12T00:05:00.000Z',
      action: { type: 'discount', value: 10 },
      compilationResult: { success: true, errors: [], warnings: [] },
    },
    {
      id: 'rule-004',
      name: 'Free Shipping Rule',
      source: 'IF cart_total >= 999\nTHEN shipping = 0',
      description: 'Free shipping on orders above ₹999',
      compiled: true,
      active: true,
      createdAt: '2024-01-13T00:00:00.000Z',
      compiledAt: '2024-01-13T00:05:00.000Z',
      action: { type: 'shipping', value: 0 },
      compilationResult: { success: true, errors: [], warnings: [] },
    },
    {
      id: 'rule-005',
      name: 'Low Stock Alert',
      source: 'IF stock < 10 AND category = "Electronics"\nTHEN discount = 5',
      description: 'Extra 5% off on low-stock Electronics',
      compiled: true,
      active: false,
      createdAt: '2024-01-14T00:00:00.000Z',
      compiledAt: '2024-01-14T00:05:00.000Z',
      action: { type: 'discount', value: 5 },
      compilationResult: { success: true, errors: [], warnings: [] },
    },
  ];
  RuleStore.save(rules);

  Store.set(KEYS.INITIALIZED, true);
}
