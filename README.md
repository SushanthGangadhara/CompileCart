# ShopDemo — Smart E-Commerce Platform with Compiler Design Rule Engine

A full-stack React application combining a real e-commerce storefront with an academic **Compiler Design Rule Engine**. Built with Vanilla React (CRA), LocalStorage, and zero paid APIs.

---

## ⚠️ Disclaimer

> **LocalStorage authentication and mock payments are for demonstration only.** Do not enter real credentials, payment card numbers, or personal data. This is an academic project.

---

## 🚀 Quick Start

```bash
cd ecommerce-app
npm install
npm start
```

Open http://localhost:3000

---

## 🔑 Demo Credentials

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Customer | user@shopdemo.com      | User@123   |
| Admin    | admin@shopdemo.com     | Admin@123  |

---

## 📁 Project Structure

```
src/
├── data/
│   ├── storage.js          # LocalStorage data layer (UserStore, ProductStore, etc.)
│   └── seed.js             # Demo data: 20 products, users, 5 coupons, 5 rules
│
├── compiler/
│   ├── lexer.js            # Phase 1: Hand-written tokenizer
│   ├── parser.js           # Phase 2: Recursive-descent parser + AST nodes
│   ├── semantic.js         # Phase 3: Type checking + semantic validation
│   ├── astVisualizer.js    # Phase 4: AST → renderable tree structure
│   ├── tacGenerator.js     # Phase 5: Three-Address Code from AST
│   ├── optimizer.js        # Phase 6: 6 optimization passes
│   ├── codeGen.js          # Phase 7: JavaScript code generation
│   ├── executor.js         # Phase 8: Safe AST interpreter (no eval)
│   └── compiler.js         # Pipeline orchestrator
│
├── context/
│   ├── AuthContext.js      # Auth state (login/logout/register)
│   └── CartContext.js      # Cart + wishlist + rule evaluation
│
├── components/
│   ├── common/             # Navbar, Footer, ProtectedRoute, ProductCard
│   └── admin/              # AdminSidebar
│
├── pages/
│   ├── customer/           # Home, Products, ProductDetail, Cart, Wishlist,
│   │                         Checkout, Orders, Profile, Login, Register
│   └── admin/
│       ├── AdminLogin, AdminLayout, Dashboard
│       ├── AdminProducts, AdminOrders, AdminCustomers
│       └── compiler/
│           ├── CompilerDashboard.jsx   # Stats + pipeline overview
│           ├── CompilerWorkbench.jsx   # Rule editor + compile button
│           ├── PhaseViews.jsx          # Lexer, Parser, Semantic, AST, TAC, Optimizer, CodeGen
│           ├── RuleTester.jsx          # Interactive rule executor
│           ├── SavedRules.jsx          # Manage + activate rules; history
│           └── ConceptsView.jsx        # Academic reference for all 8 phases
│
└── styles/
    └── global.css          # Design system (colors, buttons, cards, tables, admin theme)
```

---

## 🧠 Compiler Design — All 8 Phases

### Phase 1: Lexical Analysis (`lexer.js`)
Hand-written scanner using character-by-character scanning with maximal munch.

**Token types:** KEYWORD, IDENTIFIER, OPERATOR, NUMBER, STRING, BOOLEAN, LPAREN, RPAREN, EOF

**Example:**
```
Input:  IF cart_total > 5000 THEN discount = 20
Tokens: [IF:KEYWORD] [cart_total:IDENTIFIER] [>:OPERATOR] [5000:NUMBER]
        [THEN:KEYWORD] [discount:IDENTIFIER] [=:OPERATOR] [20:NUMBER]
```

### Phase 2: Syntax Analysis (`parser.js`)
Recursive-descent parser implementing this grammar:
```
RULE       → IF CONDITION THEN ACTION
CONDITION  → OR_EXPR
OR_EXPR    → AND_EXPR (OR AND_EXPR)*
AND_EXPR   → NOT_EXPR (AND NOT_EXPR)*
NOT_EXPR   → NOT NOT_EXPR | COMPARISON
COMPARISON → EXPRESSION REL_OP EXPRESSION
EXPRESSION → TERM ((+|-) TERM)*
TERM       → FACTOR ((*|/) FACTOR)*
FACTOR     → NUMBER | STRING | BOOLEAN | IDENTIFIER | ( CONDITION )
ACTION     → IDENTIFIER = EXPRESSION
```

### Phase 3: Semantic Analysis (`semantic.js`)
- Identifier type checking against `IDENTIFIER_TYPES` symbol table
- Type compatibility: string comparisons only with `=` or `!=`
- Value range validation: discount 0-100, shipping 0-10000
- Action target validation: only `discount`, `shipping`, `price`

### Phase 4: AST (`astVisualizer.js`)
Built by the parser as a result of parsing (not hardcoded). Interactive HTML tree rendering.

### Phase 5: TAC Generation (`tacGenerator.js`)
Three-address code from AST walk. Example:
```
t1 = cart_total > 5000
t2 = category = "Electronics"
t3 = t1 AND t2
IF NOT t3 GOTO end
discount = 20
```

### Phase 6: Optimization (`optimizer.js`)
Six passes:
1. Constant Folding
2. Constant Propagation
3. Copy Propagation
4. Dead Temporary Elimination
5. Redundant Instruction Elimination
6. Algebraic Simplification (x*1=x, x+0=x, x*0=0)

### Phase 7: Code Generation (`codeGen.js`)
Generates JavaScript from the validated AST:
```javascript
function applyRule(ctx) {
  if ((ctx.cart_total > 5000 && ctx.category === "Electronics")) {
    ctx.discount = 20;
  }
}
```

### Phase 8: Safe Execution (`executor.js`)
AST interpreter using recursive `evalNode()` — **no eval(), no Function constructor.**
Only validated, compiled rules can be activated.

---

## 🛒 Sample Business Rules

| Rule | Source | Effect |
|------|--------|--------|
| Electronics Discount | `IF cart_total > 5000 AND category = "Electronics" THEN discount = 20` | 20% off electronics |
| Bulk Purchase | `IF quantity >= 3 AND cart_total > 2000 THEN discount = 15` | 15% off bulk orders |
| Premium Customer | `IF customer_type = "premium" AND cart_total > 1000 THEN discount = 10` | 10% off for premium |
| Free Shipping | `IF cart_total >= 999 THEN shipping = 0` | Free shipping |
| Low Stock Promo | `IF stock < 10 AND category = "Electronics" THEN discount = 5` | 5% off low-stock items |

---

## 🧪 Test Cases & Results

All tests were executed against the running application.

| Test | Input | Expected | Result |
|------|-------|----------|--------|
| Valid login (customer) | user@shopdemo.com / User@123 | Redirect to home | ✅ PASS |
| Valid login (admin) | admin@shopdemo.com / Admin@123 | Redirect to admin dashboard | ✅ PASS |
| Invalid login | wrong@email.com / wrongpw | Error message | ✅ PASS |
| Register new user | Valid form | Account created, session set | ✅ PASS |
| Register duplicate email | user@shopdemo.com | "Email already registered" error | ✅ PASS |
| Add to cart (in stock) | Product with stock > 0 | Item added | ✅ PASS |
| Add to cart (out of stock) | Product with stock = 0 | Disabled button | ✅ PASS |
| Cart stock validation | Qty > available stock | Error message | ✅ PASS |
| Coupon WELCOME10 | 10% off any order ≥ ₹500 | Discount applied in cart | ✅ PASS |
| Coupon invalid | BADCODE | "Invalid coupon code" | ✅ PASS |
| Checkout flow | Address + payment → place order | Order created, stock reduced | ✅ PASS |
| Admin product add | Fill form → Save | Product appears in storefront | ✅ PASS |
| Admin order status | Change Pending → Shipped | Customer order shows Shipped | ✅ PASS |
| Lexer error | `discount = @20` | Unknown character '@' | ✅ PASS |
| Syntax error | `IF cart_total > THEN discount = 10` | Parser error with line/col | ✅ PASS |
| Semantic error | `IF cart_total > "hello" THEN discount = 10` | Type mismatch error | ✅ PASS |
| AST generation | Valid rule | Tree rendered in AST view | ✅ PASS |
| TAC generation | Valid rule | Instructions shown with temps | ✅ PASS |
| Optimization | Rule with no constants | "No optimization necessary" | ✅ PASS |
| Code generation | Valid rule | JavaScript output shown | ✅ PASS |
| Rule execution | Electronics rule + matching cart | 20% discount applied | ✅ PASS |
| Rule deactivation | Deactivate active rule | Discount no longer applied | ✅ PASS |
| Admin route guard | Navigate to /admin as customer | Redirect to /admin/login | ✅ PASS |

---

## 🛑 Limitations

1. **No real backend** — all data is in LocalStorage (cleared on browser data wipe)
2. **No real payments** — mock payment with fake card numbers
3. **No real authentication** — passwords stored as plaintext in LocalStorage (academic demo only)
4. **Single-browser session** — different browsers won't share data
5. **No image uploads** — products use emoji icons
6. **Compiler limitations** — arithmetic in conditions is parsed but business rules typically use simple comparisons

## 🔮 Future Improvements

1. Replace LocalStorage with a real backend (Node.js + PostgreSQL)
2. Add JWT authentication with bcrypt password hashing
3. Add real payment gateway integration
4. Add product image upload support
5. Implement more complex compiler optimizations (loop unrolling, inlining)
6. Add rule versioning and rollback
7. Add A/B testing for rules
8. Extend the rule language with FOREACH, aggregate functions
