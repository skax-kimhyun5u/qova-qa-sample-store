const products = [
  { id: "focus-notebook", name: "포커스 노트", category: "paper", price: 12000, description: "작업을 한 페이지에 정리하는 도트 노트" },
  { id: "orbit-tray", name: "오빗 데스크 트레이", category: "desk", price: 26000, description: "작은 도구를 모아두는 알루미늄 트레이" },
  { id: "halo-lamp", name: "헤일로 미니 램프", category: "light", price: 49000, description: "밝기 3단계를 지원하는 USB-C 조명" },
  { id: "daily-cards", name: "데일리 카드", category: "paper", price: 9000, description: "하루 우선순위 세 가지를 기록하는 카드" },
  { id: "cable-dock", name: "케이블 도크", category: "desk", price: 17000, description: "충전 케이블을 고정하는 실리콘 홀더" },
  { id: "beam-light", name: "빔 모니터 라이트", category: "light", price: 68000, description: "화면 반사를 줄이는 비대칭 데스크 조명" },
];

const state = { category: "all", query: "", cart: new Map(), hiddenProductIds: new Set(), auditCount: 0 };
const productGrid = document.querySelector("#productGrid");
const productSearch = document.querySelector("#productSearch");
const resultSummary = document.querySelector("#resultSummary");
const cartPanel = document.querySelector("#cartPanel");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartTotal = document.querySelector("#cartTotal");
const checkoutButton = document.querySelector("#checkoutButton");
const checkoutDialog = document.querySelector("#checkoutDialog");
const checkoutForm = document.querySelector("#checkoutForm");
const email = document.querySelector("#email");
const emailError = document.querySelector("#emailError");
const scrim = document.querySelector("#scrim");
const toast = document.querySelector("#toast");
const sessionStatus = document.querySelector("#sessionStatus");
const permissionResult = document.querySelector("#permissionResult");
const auditSummary = document.querySelector("#auditSummary");
const toggleHaloVisibility = document.querySelector("#toggleHaloVisibility");

function currency(value) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
}

function visibleProducts() {
  const query = state.query.trim().toLocaleLowerCase("ko-KR");
  return products.filter((product) => {
    if (state.hiddenProductIds.has(product.id)) return false;
    const matchesCategory = state.category === "all" || product.category === state.category;
    const matchesQuery = !query || `${product.name} ${product.description}`.toLocaleLowerCase("ko-KR").includes(query);
    return matchesCategory && matchesQuery;
  });
}

function renderInventory() {
  const hidden = state.hiddenProductIds.has("halo-lamp");
  toggleHaloVisibility.textContent = hidden ? "상품 다시 공개" : "상품 숨기기";
  auditSummary.textContent = `감사 기록 ${state.auditCount}건`;
  renderProducts();
}

async function loadInventory() {
  const response = await fetch("/api/inventory");
  const inventory = await response.json();
  state.hiddenProductIds = new Set(inventory.hiddenProductIds);
  state.auditCount = inventory.auditLog.length;
  renderInventory();
}

function renderProducts() {
  const visible = visibleProducts();
  resultSummary.textContent = `${visible.length}개의 상품`;
  productGrid.innerHTML = visible.length ? visible.map((product) => `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-art" aria-hidden="true">${product.name.slice(0, 1)}</div>
      <p class="product-category">${product.category.toUpperCase()}</p>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <div class="product-footer">
        <strong>${currency(product.price)}</strong>
        <button type="button" data-add="${product.id}" aria-label="${product.name} 장바구니에 담기">담기</button>
      </div>
    </article>
  `).join("") : '<p class="empty">조건에 맞는 상품이 없습니다.</p>';
}

function renderCart() {
  const rows = [...state.cart.entries()];
  const count = rows.reduce((total, [, quantity]) => total + quantity, 0);
  const total = rows.reduce((sum, [id, quantity]) => sum + products.find((item) => item.id === id).price * quantity, 0);
  cartCount.textContent = String(count);
  cartTotal.textContent = currency(total);
  checkoutButton.disabled = count === 0;
  cartItems.innerHTML = rows.length ? rows.map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return `<div class="cart-row" data-cart-id="${id}">
      <div><strong>${product.name}</strong><span>${currency(product.price)}</span></div>
      <div class="quantity" aria-label="${product.name} 수량">
        <button type="button" data-decrease="${id}" aria-label="${product.name} 수량 줄이기">−</button>
        <output aria-label="${product.name} 현재 수량">${quantity}</output>
        <button type="button" data-increase="${id}" aria-label="${product.name} 수량 늘리기">+</button>
      </div>
    </div>`;
  }).join("") : '<p class="empty">장바구니가 비어 있습니다.</p>';
}

function openCart() {
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
  scrim.hidden = false;
}

function closeCart() {
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
  scrim.hidden = true;
}

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    state.category = button.dataset.category;
    document.querySelectorAll("[data-category]").forEach((item) => item.classList.toggle("active", item === button));
    renderProducts();
  });
});

productSearch.addEventListener("input", () => {
  state.query = productSearch.value;
  renderProducts();
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const id = button.dataset.add;
  state.cart.set(id, (state.cart.get(id) ?? 0) + 1);
  renderCart();
  toast.textContent = "장바구니에 상품을 담았습니다.";
});

cartItems.addEventListener("click", (event) => {
  const increase = event.target.closest("[data-increase]");
  const decrease = event.target.closest("[data-decrease]");
  const id = increase?.dataset.increase ?? decrease?.dataset.decrease;
  if (!id) return;
  const next = (state.cart.get(id) ?? 0) + (increase ? 1 : -1);
  if (next > 0) state.cart.set(id, next);
  else state.cart.delete(id);
  renderCart();
});

document.querySelector("#cartButton").addEventListener("click", openCart);
document.querySelector("#closeCart").addEventListener("click", closeCart);
scrim.addEventListener("click", closeCart);
checkoutButton.addEventListener("click", () => {
  closeCart();
  emailError.textContent = "";
  checkoutDialog.showModal();
  email.focus();
});
document.querySelector("#closeCheckout").addEventListener("click", () => checkoutDialog.close());

checkoutForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!email.validity.valid) {
    emailError.textContent = "올바른 이메일 주소를 입력해 주세요.";
    email.focus();
    return;
  }
  const orderNumber = `ORB-${String(Date.now()).slice(-6)}`;
  state.cart.clear();
  renderCart();
  checkoutDialog.close();
  toast.textContent = `주문이 완료되었습니다. 주문번호 ${orderNumber}`;
  checkoutForm.reset();
});

document.querySelectorAll("[data-actor]").forEach((button) => {
  button.addEventListener("click", async () => {
    permissionResult.textContent = "";
    toggleHaloVisibility.hidden = true;
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorId: button.dataset.actor }),
    });
    const session = await response.json();
    if (!response.ok) {
      permissionResult.textContent = session.error;
      return;
    }
    sessionStatus.textContent = `${session.name} 세션 · ${session.role}`;
    toggleHaloVisibility.hidden = false;
  });
});

toggleHaloVisibility.addEventListener("click", async () => {
  permissionResult.textContent = "";
  const hidden = !state.hiddenProductIds.has("halo-lamp");
  const response = await fetch("/api/inventory/visibility", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: "halo-lamp", hidden }),
  });
  const result = await response.json();
  if (!response.ok) {
    permissionResult.textContent = result.error;
    return;
  }
  state.hiddenProductIds = new Set(result.hiddenProductIds);
  state.auditCount += 1;
  permissionResult.textContent = hidden ? "관리자 권한으로 상품을 숨겼습니다." : "관리자 권한으로 상품을 다시 공개했습니다.";
  renderInventory();
});

renderProducts();
renderCart();
loadInventory();
