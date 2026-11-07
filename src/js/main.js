const GOALS = { calories: 2000, protein: 50, carbs: 250, fat: 65 };

/* ============================================
   SELECT THE ELEMENTS
   ============================================ */
const loadingOverlay = document.getElementById("app-loading-overlay");
const navLinks = document.querySelectorAll(".nav-link");
const headerTitle = document.querySelector("#header h1");
const headerSubtitle = document.querySelector("#header p");

// Sections
const searchFiltersSection = document.getElementById("search-filters-section");
const mealCategoriesSection = document.getElementById("meal-categories-section");
const allRecipesSection = document.getElementById("all-recipes-section");
const mealDetailsSection = document.getElementById("meal-details");
const productsSection = document.getElementById("products-section");
const foodlogSection = document.getElementById("foodlog-section");

// Home
const searchInput = document.getElementById("search-input");
const areasContainer = document.querySelector("#search-filters-section .flex.items-center.gap-3");
const categoriesGrid = document.getElementById("categories-grid");
const recipesGrid = document.getElementById("recipes-grid");
const recipesCount = document.getElementById("recipes-count");

// Meal Details
const backToMealsBtn = document.getElementById("back-to-meals-btn");
const logMealBtn = document.getElementById("log-meal-btn");
const ingredientsContainer = mealDetailsSection.querySelector(".lg\\:col-span-2 > div:nth-child(1) .grid");
const instructionsContainer = mealDetailsSection.querySelector(".lg\\:col-span-2 > div:nth-child(2) .space-y-4");

// Product Scanner
const productSearchInput = document.getElementById("product-search-input");
const searchProductBtn = document.getElementById("search-product-btn");
const barcodeInput = document.getElementById("barcode-input");
const lookupBarcodeBtn = document.getElementById("lookup-barcode-btn");
const productsGrid = document.getElementById("products-grid");

// Food Log
const foodlogDate = document.getElementById("foodlog-date");
const loggedItemsList = document.getElementById("logged-items-list");
const clearFoodlogBtn = document.getElementById("clear-foodlog");

const allAreaBtnTemplate = areasContainer.children[0].cloneNode(true);
const areaBtnTemplate = areasContainer.children[1].cloneNode(true);
const categoryTemplate = document.querySelector(".category-card").cloneNode(true);
const recipeTemplate = document.querySelector(".recipe-card").cloneNode(true);
const ingredientTemplate = ingredientsContainer.children[0].cloneNode(true);
const instructionTemplate = instructionsContainer.children[0].cloneNode(true);
const productTemplate = document.querySelector(".product-card").cloneNode(true);
const emptyLogTemplate = loggedItemsList.innerHTML;

let currentMeal = null;
let foodLog;
let recipes;
let products;

const pageHeaders = {
  home: ["Meals & Recipes", "Discover delicious and nutritious recipes tailored for you"],
  details: ["Recipe Details", "Everything you need to cook and track this meal"],
  scanner: ["Product Scanner", "Search packaged foods by name or barcode and check their nutrition"],
  foodlog: ["Food Log", "Track and monitor your daily nutrition intake"],
};

class Helper {
  static esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  static num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  static round1(n) {
    return Math.round(Helper.num(n) * 10) / 10;
  }

  static todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}


class Popup {
  static hasSwal() {
    return typeof window.Swal !== "undefined";
  }


  static ensureSwal() {
    if (Popup.hasSwal()) return Promise.resolve();
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  static injectStyles() {
    if (document.getElementById("np-popup-style")) return;
    const style = document.createElement("style");
    style.id = "np-popup-style";
    style.textContent = `
      .np-popup { width: 440px !important; max-width: 94vw !important; padding: 24px !important; border-radius: 20px !important; }
      .np-html { margin: 0 !important; padding: 0 !important; text-align: left !important; overflow: visible !important; }
      .np-actions { width: 100% !important; display: flex !important; gap: 12px !important; margin: 24px 0 0 !important; padding: 0 !important; }
      .np-actions button { flex: 1; padding: 14px !important; border: 0 !important; border-radius: 12px !important; font-weight: 600 !important; font-size: 15px !important; cursor: pointer; }
      .np-cancel { background: #f3f4f6 !important; color: #374151 !important; }
      .np-cancel:hover { background: #e5e7eb !important; }
      .np-confirm { background: #155dfc !important; color: #fff !important; }
      .np-confirm:hover { background: #1447e6 !important; }
      .np-step { width: 40px; height: 40px; border: 0; border-radius: 10px; background: #f3f4f6; color: #374151; font-size: 16px; cursor: pointer; }
      .np-step:hover { background: #e5e7eb; }
      #np-servings { width: 80px; height: 48px; text-align: center; font-size: 20px; font-weight: 700; color: #111827; border: 2px solid #e5e7eb; border-radius: 10px; outline: none; }
      #np-servings:focus { border-color: #155dfc; }
      #np-servings::-webkit-outer-spin-button, #np-servings::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      #np-servings { -moz-appearance: textfield; }
    `;
    document.head.appendChild(style);
  }

  static async confirm(options) {
    if (Popup.hasSwal()) {
      const result = await Swal.fire({
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        cancelButtonText: "Cancel",
        ...options,
      });
      return result.isConfirmed;
    }
    return window.confirm(`${options.title}\n${options.text || ""}`);
  }

  static async notify(options) {
    if (Popup.hasSwal()) await Swal.fire(options);
  }

  static async askServings(item, kind) {
    if (!Popup.hasSwal()) {
      const v = parseFloat(window.prompt(`How many servings of ${item.name}?`, "1"));
      return v > 0 ? v : null;
    }

    const isMeal = kind === "meal";
    const fallbackIcon = `<div style="width:64px;height:64px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af"><i class="fa-solid fa-utensils"></i></div>`;

    const result = await Swal.fire({
      html: `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
          ${item.image
            ? `<img src="${Helper.esc(item.image)}" alt="" style="width:64px;height:64px;border-radius:12px;object-fit:cover" onerror="this.outerHTML='${fallbackIcon.replace(/'/g, "&#39;")}'">`
            : fallbackIcon}
          <div style="min-width:0">
            <h2 style="margin:0;font-size:20px;font-weight:700;color:#111827">${isMeal ? "Log This Meal" : "Log This Product"}</h2>
            <p style="margin:2px 0 0;color:#6b7280">${Helper.esc(item.name)}</p>
          </div>
        </div>

        <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#374151">Number of Servings</p>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <button type="button" class="np-step" id="np-minus"><i class="fa-solid fa-minus"></i></button>
          <input type="number" id="np-servings" value="1" min="0.5" step="0.5">
          <button type="button" class="np-step" id="np-plus"><i class="fa-solid fa-plus"></i></button>
        </div>

        <div style="background:#ecfdf5;border-radius:12px;padding:16px">
          <p style="margin:0 0 12px;font-size:14px;color:#4b5563">Estimated nutrition per serving${isMeal ? "" : " (100g)"}:</p>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);text-align:center">
            <div><div style="font-size:20px;font-weight:700;color:#059669">${Math.round(item.calories)}</div><div style="font-size:12px;color:#6b7280">Calories</div></div>
            <div><div style="font-size:20px;font-weight:700;color:#2563eb">${Math.round(item.protein)}g</div><div style="font-size:12px;color:#6b7280">Protein</div></div>
            <div><div style="font-size:20px;font-weight:700;color:#d97706">${Math.round(item.carbs)}g</div><div style="font-size:12px;color:#6b7280">Carbs</div></div>
            <div><div style="font-size:20px;font-weight:700;color:#9333ea">${Math.round(item.fat)}g</div><div style="font-size:12px;color:#6b7280">Fat</div></div>
          </div>
        </div>`,
      showCancelButton: true,
      buttonsStyling: false,
      confirmButtonText: '<i class="fa-solid fa-clipboard-list" style="margin-right:8px"></i>Log Meal',
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: { popup: "np-popup", htmlContainer: "np-html", actions: "np-actions", confirmButton: "np-confirm", cancelButton: "np-cancel" },
      didOpen: () => {
        const popup = Swal.getPopup();
        const input = popup.querySelector("#np-servings");

        const change = (delta) => {
          input.value = Math.max(0.5, Helper.round1(Helper.num(input.value) + delta));
        };

        popup.querySelector("#np-minus").addEventListener("click", () => change(-0.5));
        popup.querySelector("#np-plus").addEventListener("click", () => change(0.5));
        input.addEventListener("keydown", (e) => e.key === "Enter" && Swal.clickConfirm());
        input.select();
      },
      preConfirm: () => {
        const value = Helper.num(Swal.getPopup().querySelector("#np-servings").value);
        if (value <= 0) {
          Swal.showValidationMessage("Please enter a valid number of servings");
          return false;
        }
        return value;
      },
    });

    return result.isConfirmed ? result.value : null;
  }
}


class Pages {
  static show(page) {
    searchFiltersSection.style.display = page === "home" ? "block" : "none";
    mealCategoriesSection.style.display = page === "home" ? "block" : "none";
    allRecipesSection.style.display = page === "home" ? "block" : "none";
    mealDetailsSection.style.display = page === "details" ? "block" : "none";
    productsSection.style.display = page === "scanner" ? "block" : "none";
    foodlogSection.style.display = page === "foodlog" ? "block" : "none";


    if (headerTitle && pageHeaders[page]) {
      headerTitle.textContent = pageHeaders[page][0];
      headerSubtitle.textContent = pageHeaders[page][1];
    }


    const activeIndex = page === "scanner" ? 1 : page === "foodlog" ? 2 : 0;

    navLinks.forEach((link, i) => {
      const active = i === activeIndex;
      link.classList.toggle("bg-emerald-50", active);
      link.classList.toggle("text-emerald-700", active);
      link.classList.toggle("text-gray-600", !active);
      link.classList.toggle("hover:bg-gray-50", !active);

      const span = link.querySelector("span");
      if (span) {
        span.classList.toggle("font-semibold", active);
        span.classList.toggle("font-medium", !active);
      }
    });

    if (page === "foodlog") foodLog.display();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/* ============================================
   RECIPES (categories / areas / meals / details)
   ============================================ */
class Recipes {
  async getCategories() {
    let res = await fetch("https://www.themealdb.com/api/json/v1/1/categories.php");
    let data = await res.json();

    categoriesGrid.innerHTML = "";

    data.categories.slice(0, 12).forEach((cat) => {
      let card = categoryTemplate.cloneNode(true);
      card.querySelector("h3").textContent = cat.strCategory;
      card.addEventListener("click", () => this.filterBy("c", cat.strCategory));
      categoriesGrid.appendChild(card);
    });
  }

  async getAreas() {
    let res = await fetch("https://www.themealdb.com/api/json/v1/1/list.php?a=list");
    let data = await res.json();

    areasContainer.innerHTML = "";

    let allBtn = allAreaBtnTemplate.cloneNode(true);
    allBtn.addEventListener("click", () => this.getMeals(""));
    areasContainer.appendChild(allBtn);

    data.meals.forEach((area) => {
      let btn = areaBtnTemplate.cloneNode(true);
      btn.textContent = area.strArea;
      btn.addEventListener("click", () => this.filterBy("a", area.strArea));
      areasContainer.appendChild(btn);
    });
  }

  async getMeals(query) {
    let res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
    let data = await res.json();
    this.displayMeals(data.meals ? data.meals.slice(0, 25) : []);
  }

  async filterBy(type, value) {
    let res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?${type}=${value}`);
    let data = await res.json();
    this.displayMeals(data.meals ? data.meals.slice(0, 25) : []);
  }

  displayMeals(meals) {
    recipesCount.textContent = `Showing ${meals.length} recipes`;
    recipesGrid.innerHTML = "";

    meals.forEach((meal) => {
      let card = recipeTemplate.cloneNode(true);
      card.querySelector("img").src = meal.strMealThumb;
      card.querySelector("h3").textContent = meal.strMeal;

      let spans = card.querySelectorAll("span");
      spans[0].textContent = meal.strCategory || "Recipe";
      spans[1].textContent = meal.strArea || "Meal";
      spans[2].textContent = meal.strCategory || "Recipe";
      spans[3].textContent = meal.strArea || "Meal";

      card.addEventListener("click", () => this.getMealDetails(meal.idMeal));
      recipesGrid.appendChild(card);
    });
  }

  async getMealDetails(id) {
    let res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
    let data = await res.json();
    let meal = data.meals[0];

    currentMeal = {
      name: meal.strMeal,
      image: meal.strMealThumb,
      calories: 485,
      protein: 42,
      carbs: 52,
      fat: 8,
    };

    mealDetailsSection.querySelector("img").src = meal.strMealThumb;
    mealDetailsSection.querySelector("h1").textContent = meal.strMeal;

    let badges = mealDetailsSection.querySelectorAll(".bottom-0 .rounded-full");
    if (badges[0]) badges[0].textContent = meal.strCategory;
    if (badges[1]) badges[1].textContent = meal.strArea;


    ingredientsContainer.innerHTML = "";
    for (let i = 1; i <= 20; i++) {
      if (meal[`strIngredient${i}`]) {
        let item = ingredientTemplate.cloneNode(true);
        item.querySelector("span").innerHTML = `<span class="font-medium text-gray-900">${meal[`strMeasure${i}`]}</span> ${meal[`strIngredient${i}`]}`;
        ingredientsContainer.appendChild(item);
      }
    }


    instructionsContainer.innerHTML = "";
    meal.strInstructions
      .split(/\r?\n/)
      .filter((step) => step.trim())
      .forEach((step, index) => {
        let stepEl = instructionTemplate.cloneNode(true);
        stepEl.querySelector("div").textContent = index + 1;
        stepEl.querySelector("p").textContent = step;
        instructionsContainer.appendChild(stepEl);
      });

    if (meal.strYoutube) {
      mealDetailsSection.querySelector("iframe").src = `https://www.youtube.com/embed/${meal.strYoutube.split("v=")[1]}`;
    }

    Pages.show("details");
  }
}

class Products {
  async search(query) {
    let res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=12`);
    let data = await res.json();
    this.display(data.products || []);
  }

  async searchByBarcode(barcode) {
    let res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    let data = await res.json();
    this.display(data.product ? [data.product] : []);
  }

  display(list) {
    productsGrid.innerHTML = "";

    list.forEach((p) => {
      let card = productTemplate.cloneNode(true);
      let n = p.nutriments || {};

      let itemData = {
        name: p.product_name || "Product",
        image: p.image_small_url || "",
        calories: Math.round(n["energy-kcal_100g"] || 200),
        protein: Math.round(n.proteins_100g || 5),
        carbs: Math.round(n.carbohydrates_100g || 25),
        fat: Math.round(n.fat_100g || 8),
      };

      card.querySelector("img").src = p.image_small_url || "";
      card.querySelector(".text-emerald-600").textContent = p.brands || "Brand";
      card.querySelector("h3").textContent = itemData.name;
      card.querySelector(".uppercase").textContent = `Nutri-Score ${(p.nutrition_grades || "A").toUpperCase()}`;

      let macros = card.querySelectorAll(".grid-cols-4 .font-bold");
      macros[0].textContent = `${itemData.protein}g`;
      macros[1].textContent = `${itemData.carbs}g`;
      macros[2].textContent = `${itemData.fat}g`;
      macros[3].textContent = `${Math.round(n.sugars_100g || 5)}g`;

      card.addEventListener("click", () => foodLog.add(itemData, "product"));
      productsGrid.appendChild(card);
    });
  }
}


class FoodLog {
  constructor() {
    this.items = JSON.parse(localStorage.getItem("foodLog")) || [];


    this.items.forEach((item, i) => {
      if (!item.id) item.id = Date.now() + i;
      if (!item.date) item.date = Helper.todayKey();
      if (!item.servings) item.servings = 1;
    });
  }

  save() {
    localStorage.setItem("foodLog", JSON.stringify(this.items));
  }

  getToday() {
    return this.items.filter((item) => !item.date || item.date === Helper.todayKey());
  }

  async add(item, kind = "meal") {
    const servings = await Popup.askServings(item, kind);
    if (!servings) return;

    const entry = {
      id: Date.now() + Math.random(),
      date: Helper.todayKey(),
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      type: kind,
      name: item.name,
      image: item.image || "",
      servings: servings,
      calories: Helper.round1(item.calories * servings),
      protein: Helper.round1(item.protein * servings),
      carbs: Helper.round1(item.carbs * servings),
      fat: Helper.round1(item.fat * servings),
    };

    this.items.push(entry);
    this.save();

    await Popup.notify({
      icon: "success",
      title: kind === "meal" ? "Meal Logged!" : "Product Logged!",
      html: `<p style="margin:0 0 8px;color:#4b5563">${Helper.esc(item.name)} (${servings} serving${servings === 1 ? "" : "s"}) has been added to your daily log.</p>
             <p style="margin:0;font-weight:700;color:#059669">+${Math.round(entry.calories)} calories</p>`,
      timer: 2200,
      timerProgressBar: true,
      showConfirmButton: false,
    });

    Pages.show("foodlog");
  }

  async remove(id) {
    const item = this.items.find((i) => String(i.id) === String(id));
    if (!item) return;

    const confirmed = await Popup.confirm({
      title: "Remove this item?",
      text: `${item.name} will be removed from your food log.`,
      confirmButtonText: "Yes, remove it!",
    });
    if (!confirmed) return;

    this.items = this.items.filter((i) => String(i.id) !== String(id));
    this.save();
    this.display();

    Popup.notify({ icon: "success", title: "Removed!", timer: 1200, showConfirmButton: false });
  }

  async clearToday() {
    const confirmed = await Popup.confirm({
      title: "Clear Today's Log?",
      text: "This will remove all logged food items for today.",
      confirmButtonText: "Yes, clear it!",
    });
    if (!confirmed) return;

    this.items = this.items.filter((i) => i.date && i.date !== Helper.todayKey());
    this.save();
    this.display();

    Popup.notify({ icon: "success", title: "Cleared!", text: "Today's log has been cleared.", timer: 1400, showConfirmButton: false });
  }

  macroChip(value, letter, bg) {
    return `<span style="padding:4px 10px;border-radius:8px;font-size:12px;color:#4b5563;background:${bg};white-space:nowrap">${Math.round(value)}g ${letter}</span>`;
  }

  display() {
    let cal = 0, pro = 0, carb = 0, fat = 0;
    loggedItemsList.innerHTML = "";

    if (foodlogDate) {
      foodlogDate.textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    }

    const todayItems = this.getToday();

    if (todayItems.length === 0) {
      loggedItemsList.innerHTML = emptyLogTemplate;
    } else {
      todayItems.forEach((item) => {
        cal += Helper.num(item.calories);
        pro += Helper.num(item.protein);
        carb += Helper.num(item.carbs);
        fat += Helper.num(item.fat);

        const label = item.type === "product" ? "Product" : "Recipe";
        const servingsText = `${item.servings} serving${item.servings === 1 ? "" : "s"}`;

        let row = document.createElement("div");
        row.className = "flex items-center gap-4 p-4 bg-gray-50 rounded-xl";
        row.innerHTML = `
          ${item.image
            ? `<img src="${Helper.esc(item.image)}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0" onerror="this.style.visibility='hidden'">`
            : `<div style="width:56px;height:56px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;color:#9ca3af;flex-shrink:0"><i class="fa-solid fa-utensils"></i></div>`}
          <div style="flex:1;min-width:0">
            <p style="margin:0;font-weight:600;color:#111827" class="truncate">${Helper.esc(item.name)}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#6b7280">${servingsText}<span style="margin:0 6px">•</span><span style="color:#059669;font-weight:500">${label}</span></p>
            <p style="margin:2px 0 0;font-size:12px;color:#9ca3af">${Helper.esc(item.time || "")}</p>
          </div>
          <div style="text-align:center;flex-shrink:0">
            <div style="font-size:20px;font-weight:700;color:#059669;line-height:1.1">${Math.round(item.calories)}</div>
            <div style="font-size:12px;color:#9ca3af">kcal</div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0">
            ${this.macroChip(item.protein, "P", "#eff6ff")}
            ${this.macroChip(item.carbs, "C", "#fefce8")}
            ${this.macroChip(item.fat, "F", "#fff7ed")}
          </div>
          <button type="button" style="background:none;border:0;color:#9ca3af;cursor:pointer;padding:8px" aria-label="Remove item"><i class="fa-solid fa-trash"></i></button>`;

        const trash = row.querySelector("button");
        trash.addEventListener("mouseenter", () => (trash.style.color = "#ef4444"));
        trash.addEventListener("mouseleave", () => (trash.style.color = "#9ca3af"));
        trash.addEventListener("click", () => this.remove(item.id));

        loggedItemsList.appendChild(row);
      });
    }

    clearFoodlogBtn.style.display = todayItems.length > 0 ? "flex" : "none";
    document.querySelector("#foodlog-today-section h4").textContent = `Logged Items (${todayItems.length})`;

    const bars = document.querySelectorAll("#foodlog-today-section .grid > div");
    this.updateBar(bars[0], "Calories", cal, GOALS.calories, "kcal");
    this.updateBar(bars[1], "Protein", pro, GOALS.protein, "g");
    this.updateBar(bars[2], "Carbs", carb, GOALS.carbs, "g");
    this.updateBar(bars[3], "Fat", fat, GOALS.fat, "g");
  }


  updateBar(box, name, val, max, unit) {
    if (!box) return;

    const over = val > max;
    const percent = Math.min(100, Math.round((val / max) * 100));
    const color = over ? "#ef4444" : "#10b981";

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px">
        <span style="color:#374151;font-weight:500">${name}</span>
        <span style="font-size:12px;color:${color}">${percent}%</span>
      </div>
      <div style="width:100%;height:8px;border-radius:9999px;background:#e5e7eb;margin:10px 0">
        <div style="width:${percent}%;height:8px;border-radius:9999px;background:${color};transition:width .3s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="font-weight:700;color:${over ? "#dc2626" : "#059669"}">${Helper.round1(val)} ${unit}</span>
        <span style="color:#9ca3af">/ ${max} ${unit}</span>
      </div>`;
  }
}

/* ============================================
   EVENT LISTENERS
   ============================================ */
foodLog = new FoodLog();
recipes = new Recipes();
products = new Products();

window.addEventListener("DOMContentLoaded", async () => {
  await Popup.ensureSwal();
  Popup.injectStyles();

  Pages.show("home");
  await recipes.getCategories();
  await recipes.getAreas();
  await recipes.getMeals("");
  foodLog.display();

  loadingOverlay.style.display = "none";
});

navLinks.forEach((link, i) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    Pages.show(i === 0 ? "home" : i === 1 ? "scanner" : "foodlog");
  });
});

searchInput.addEventListener("input", () => recipes.getMeals(searchInput.value.trim()));

backToMealsBtn.addEventListener("click", () => Pages.show("home"));

logMealBtn.addEventListener("click", () => currentMeal && foodLog.add(currentMeal, "meal"));


searchProductBtn.addEventListener("click", () => products.search(productSearchInput.value.trim()));

lookupBarcodeBtn.addEventListener("click", () => products.searchByBarcode(barcodeInput.value.trim()));

clearFoodlogBtn.addEventListener("click", () => foodLog.clearToday());

window.addEventListener("DOMContentLoaded", () => {
  const label = [...foodlogSection.querySelectorAll("*")].find(
    (el) => el.children.length === 0 && el.textContent.trim() === "Log a Meal"
  );
  if (!label) return;

  let container = label.parentElement;
  while (container && container !== foodlogSection && container.children.length !== 3) {
    container = container.parentElement;
  }
  if (container && container !== foodlogSection) container.remove();
});