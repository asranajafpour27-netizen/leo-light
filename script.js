/* LEO LIGHT - Store functionality */
'use strict';

const WHATSAPP_NUMBER = '989000000000';
const PRODUCTS_PER_PAGE = 20;
const PULL_DISTANCE = 55;

const $ = (id) => document.getElementById(id);

const introScreen = $('introScreen');
const store = $('store');
const lampScene = $('lampScene');
const pullCord = $('pullCord');
const introHint = $('introHint');
const skipIntro = $('skipIntro');

const productList = $('productList');
const categoryList = $('categoryList');
const productSearch = $('productSearch');
const productCount = $('productCount');
const loadMoreButton = $('loadMore');

const productDetail = $('productDetail');
const backToProducts = $('backToProducts');

const menuToggle = $('menuToggle');
const mainNav = $('mainNav');
const sortProducts = $('sortProducts');
const minPriceInput = $('minPrice');
const maxPriceInput = $('maxPrice');
const inStockOnly = $('inStockOnly');
const clearFiltersButton = $('clearFilters');
const showFavoritesButton = $('showFavorites');

let allProducts = [];
let visibleProducts = [];
let activeCategory = '';
let visibleLimit = PRODUCTS_PER_PAGE;
let showingFavorites = false;
let lightingStarted = false;
let dragging = false;
let dragStartY = 0;

function readFavorites() {
  try {
    const saved = JSON.parse(
      localStorage.getItem('leoLightFavorites') || '[]'
    );

    return new Set(
      Array.isArray(saved) ? saved.map(String) : []
    );
  } catch (error) {
    console.warn('خواندن علاقه‌مندی‌ها ناموفق بود.', error);
    return new Set();
  }
}

let favoriteProducts = readFavorites();

function turnOnLight() {
  if (lightingStarted) return;

  lightingStarted = true;
  dragging = false;

  introHint?.classList.add('is-hidden');
  introScreen?.classList.add('is-lighting');
  store?.classList.add('is-visible');
  store?.setAttribute('aria-hidden', 'false');

  document.body.classList.remove('intro-active');

  window.setTimeout(() => {
    introScreen?.classList.add('is-hidden');
  }, 1300);
}

if (pullCord) {
  pullCord.addEventListener('pointerdown', (event) => {
    if (lightingStarted) return;

    dragging = true;
    dragStartY = event.clientY;

    pullCord.style.transition = 'none';

    try {
      pullCord.setPointerCapture(event.pointerId);
    } catch (error) {
      // ادامه‌ی کار حتی اگر pointer capture پشتیبانی نشود
    }

    event.preventDefault();
  });

  pullCord.addEventListener('pointermove', (event) => {
    if (!dragging || lightingStarted) return;

    const distance = Math.max(
      0,
      Math.min(event.clientY - dragStartY, 90)
    );

    pullCord.style.transform =
      `translateX(-50%) translateY(${distance}px)`;

    if (distance >= PULL_DISTANCE) {
      turnOnLight();
    }
  });

  function releaseCord() {
    if (!dragging) return;

    dragging = false;

    if (!lightingStarted) {
      pullCord.style.transition = 'transform .3s ease';
      pullCord.style.transform = 'translateX(-50%)';

      window.setTimeout(() => {
        if (pullCord) pullCord.style.transition = '';
      }, 300);
    }
  }

  pullCord.addEventListener('pointerup', releaseCord);
  pullCord.addEventListener('pointercancel', releaseCord);
  pullCord.addEventListener('lostpointercapture', releaseCord);
}

lampScene?.addEventListener('click', (event) => {
  if (event.target.closest('#pullCord')) return;
  turnOnLight();
});

skipIntro?.addEventListener('click', turnOnLight);

document.body.classList.add('intro-active');

menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav?.classList.toggle('is-open') ?? false;

  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute(
    'aria-label',
    isOpen ? 'بستن منو' : 'باز کردن منو'
  );
});

mainNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'باز کردن منو');
  });
});

function formatPrice(value) {
  if (value === null || value === undefined || value === '') {
    return 'برای اطلاع از قیمت تماس بگیرید';
  }

  const normalized = String(value)
    .replace(/[٬,\s]/g, '')
    .trim();

  const number = Number(normalized);

  if (!Number.isFinite(number) || number <= 0) {
    return 'برای اطلاع از قیمت تماس بگیرید';
  }

  return `${number.toLocaleString('fa-IR')} تومان`;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function getDescription(product) {
  const container = document.createElement('div');

  container.innerHTML =
    product.shortDescription || product.description || '';

  return (container.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSafeDescriptionHTML(product) {
  const container = document.createElement('div');

  container.innerHTML =
    product.description || product.shortDescription || '';

  container.querySelectorAll(
    'script,style,iframe,object,embed,form,input,button,textarea'
  ).forEach((element) => element.remove());

  container.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (
        name.startsWith('on') ||
        (
          (name === 'href' || name === 'src') &&
          value.startsWith('javascript:')
        )
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return container.innerHTML;
}

function getProductImages(product) {
  if (!Array.isArray(product.images)) return [];

  return product.images.filter(
    (url) => typeof url === 'string' && /^https?:\/\//i.test(url)
  );
}

function makeWhatsAppLink(product) {
  const message = [
    'سلام، برای سفارش از لئو لایت پیام می‌دهم.',
    `نام محصول: ${product.name || ''}`,
    product.sku ? `کد محصول: ${product.sku}` : '',
    product.url ? `لینک محصول در سایت فعلی: ${product.url}` : ''
  ].filter(Boolean).join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function saveFavorites() {
  try {
    localStorage.setItem(
      'leoLightFavorites',
      JSON.stringify([...favoriteProducts])
    );
  } catch (error) {
    console.warn('ذخیره علاقه‌مندی‌ها انجام نشد.', error);
  }
}

function toggleFavorite(productId) {
  const id = String(productId);

  if (favoriteProducts.has(id)) {
    favoriteProducts.delete(id);
  } else {
    favoriteProducts.add(id);
  }

  saveFavorites();
  renderProducts();
}

function toggleFavoritesView() {
  showingFavorites = !showingFavorites;

  if (showFavoritesButton) {
    showFavoritesButton.setAttribute(
      'aria-pressed',
      String(showingFavorites)
    );

    showFavoritesButton.textContent = showingFavorites
      ? '♡ نمایش همه محصولات'
      : '♡ علاقه‌مندی‌ها';
  }

  visibleLimit = PRODUCTS_PER_PAGE;
  renderProducts();
}

showFavoritesButton?.addEventListener('click', toggleFavoritesView);

function createProductCard(product) {
  const card = createElement('article', 'product-card');

  const openButton = createElement('button', 'product-open');
  openButton.type = 'button';
  openButton.setAttribute(
    'aria-label',
    `مشاهده جزئیات ${product.name || 'محصول'}`
  );

  const imageWrap = createElement('div', 'product-image-wrap');
  const image = createElement('img', 'product-image');

  image.alt = product.name || 'محصول لئو لایت';
  image.loading = 'lazy';
  image.decoding = 'async';

  const images = getProductImages(product);

  if (images.length) {
    image.src = images[0];
  } else {
    image.alt = 'تصویری برای این محصول ثبت نشده است';
  }

  image.addEventListener('error', () => {
    image.alt = 'تصویر محصول در دسترس نیست';
  }, { once: true });

  imageWrap.appendChild(image);

  const name = createElement(
    'h3',
    '',
    product.name || 'محصول بدون نام'
  );

  openButton.append(imageWrap, name);
  openButton.addEventListener('click', () => openProduct(product));

  const favoriteButton = createElement(
    'button',
    'favorite-button',
    favoriteProducts.has(String(product.id)) ? '♥' : '♡'
  );

  favoriteButton.type = 'button';
  favoriteButton.setAttribute(
    'aria-label',
    'افزودن یا حذف از علاقه‌مندی‌ها'
  );

  favoriteButton.setAttribute(
    'aria-pressed',
    String(favoriteProducts.has(String(product.id)))
  );

  favoriteButton.addEventListener('click', () => {
    toggleFavorite(product.id);
  });

  const description = createElement(
    'p',
    'product-description',
    getDescription(product) ||
      'برای دریافت اطلاعات بیشتر، جزئیات محصول را ببینید.'
  );

  const price = createElement(
    'p',
    'product-price',
    formatPrice(product.price)
  );

  const orderButton = createElement(
    'a',
    'gold-button',
    'سفارش از واتساپ'
  );

  orderButton.href = makeWhatsAppLink(product);
  orderButton.target = '_blank';
  orderButton.rel = 'noopener noreferrer';

  card.append(
    openButton,
    favoriteButton,
    description,
    price,
    orderButton
  );

  return card;
}

function getFilteredProducts() {
  const searchTerm = (productSearch?.value || '')
    .trim()
    .toLocaleLowerCase('fa');

  const minRaw = minPriceInput?.value ?? '';
  const maxRaw = maxPriceInput?.value ?? '';

  const minPrice = minRaw === '' ? null : Number(minRaw);
  const maxPrice = maxRaw === '' ? null : Number(maxRaw);
  const sortOrder = sortProducts?.value || 'default';

  const filtered = allProducts.filter((product) => {
    const categories = Array.isArray(product.categories)
      ? product.categories
      : [];

    const searchText = [
      product.name,
      product.sku,
      product.shortDescription,
      getDescription(product),
      ...categories
    ].join(' ').toLocaleLowerCase('fa');

    const price = Number(product.price) || 0;

    return (
      (!activeCategory || categories.includes(activeCategory)) &&
      searchText.includes(searchTerm) &&
      (minPrice === null ||
        (Number.isFinite(minPrice) && price >= minPrice)) &&
      (maxPrice === null ||
        (Number.isFinite(maxPrice) && price <= maxPrice)) &&
      (!inStockOnly?.checked || product.inStock === true) &&
      (!showingFavorites ||
        favoriteProducts.has(String(product.id)))
    );
  });

  if (sortOrder === 'price-asc') {
    filtered.sort(
      (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)
    );
  } else if (sortOrder === 'price-desc') {
    filtered.sort(
      (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)
    );
  } else if (sortOrder === 'name-asc') {
    filtered.sort(
      (a, b) => (a.name || '').localeCompare(b.name || '', 'fa')
    );
  } else if (sortOrder === 'name-desc') {
    filtered.sort(
      (a, b) => (b.name || '').localeCompare(a.name || '', 'fa')
    );
  }

  return filtered;
}

function renderProducts() {
  if (!productList) return;

  visibleProducts = getFilteredProducts();
  productList.replaceChildren();

  const shown = visibleProducts.slice(0, visibleLimit);

  if (!shown.length) {
    productList.appendChild(
      createElement(
        'p',
        'empty-message',
        'محصولی با این مشخصات پیدا نشد.'
      )
    );
  } else {
    const fragment = document.createDocumentFragment();

    shown.forEach((product) => {
      fragment.appendChild(createProductCard(product));
    });

    productList.appendChild(fragment);
  }

  if (productCount) {
    productCount.textContent =
      `${shown.length.toLocaleString('fa-IR')} از ` +
      `${visibleProducts.length.toLocaleString('fa-IR')} محصول`;
  }

  if (loadMoreButton) {
    loadMoreButton.hidden = visibleLimit >= visibleProducts.length;
  }
}

function renderCategories() {
  if (!categoryList) return;

  categoryList.replaceChildren();

  const categories = [
    ...new Set(
      allProducts.flatMap((product) =>
        Array.isArray(product.categories) ? product.categories : []
      )
    )
  ].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fa'));

  const items = [
    { label: 'همه محصولات', value: '' },
    ...categories.map((value) => ({ label: value, value }))
  ];

  items.forEach(({ label, value }) => {
    const button = createElement('button', 'category-card', label);
    button.type = 'button';

    if (activeCategory === value) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      activeCategory = value;
      visibleLimit = PRODUCTS_PER_PAGE;

      renderCategories();
      renderProducts();

      $('products')?.scrollIntoView({ behavior: 'smooth' });
    });

    categoryList.appendChild(button);
  });
}

function applyProductFilters() {
  visibleLimit = PRODUCTS_PER_PAGE;
  renderProducts();
}

productSearch?.addEventListener('input', applyProductFilters);

sortProducts?.addEventListener('change', applyProductFilters);
minPriceInput?.addEventListener('input', applyProductFilters);
maxPriceInput?.addEventListener('input', applyProductFilters);
inStockOnly?.addEventListener('change', applyProductFilters);

clearFiltersButton?.addEventListener('click', () => {
  if (productSearch) productSearch.value = '';
  if (sortProducts) sortProducts.value = 'default';
  if (minPriceInput) minPriceInput.value = '';
  if (maxPriceInput) maxPriceInput.value = '';
  if (inStockOnly) inStockOnly.checked = false;

  activeCategory = '';
  showingFavorites = false;
  visibleLimit = PRODUCTS_PER_PAGE;

  if (showFavoritesButton) {
    showFavoritesButton.setAttribute('aria-pressed', 'false');
    showFavoritesButton.textContent = '♡ علاقه‌مندی‌ها';
  }

  renderCategories();
  renderProducts();
});

loadMoreButton?.addEventListener('click', () => {
  visibleLimit += PRODUCTS_PER_PAGE;
  renderProducts();
});

function openProduct(product) {
  const setText = (id, text) => {
    const element = $(id);
    if (element) element.textContent = text;
  };

  setText('productsHeading', 'جزئیات محصول');

  setText(
    'detailCategory',
    Array.isArray(product.categories) && product.categories.length
      ? product.categories.join('، ')
      : 'محصول لئو لایت'
  );

  setText('detailName', product.name || 'محصول بدون نام');

  setText(
    'detailSku',
    product.sku
      ? `کد محصول: ${product.sku}`
      : 'کد محصول ثبت نشده است'
  );

  setText(
    'detailStock',
    product.inStock === false
      ? 'وضعیت: ناموجود'
      : product.inStock === true
        ? 'وضعیت: موجود در فایل محصولات'
        : ''
  );

  setText('detailPrice', formatPrice(product.price));

  const description = $('detailDescription');

  if (description) {
    description.replaceChildren();

    const html = getSafeDescriptionHTML(product);

    if (html.trim()) {
      description.innerHTML = html;
    } else {
      description.textContent =
        'توضیحات کامل برای این محصول در فایل اطلاعات موجود نیست. ' +
        'برای دریافت مشخصات با فروشگاه تماس بگیرید.';
    }
  }

  setText(
    'detailExtraText',
    getDescription(product) || 'اطلاعات بیشتری در فایل فعلی ثبت نشده است.'
  );

  const gallery = $('detailGallery');

  if (gallery) {
    gallery.replaceChildren();

    const images = getProductImages(product);

    if (!images.length) {
      gallery.appendChild(
        createElement(
          'p',
          'empty-message',
          'تصویری برای این محصول ثبت نشده است.'
        )
      );
    }

    images.forEach((url, index) => {
      const img = createElement('img');

      img.src = url;
      img.alt =
        `${product.name || 'محصول'} - تصویر ${index + 1}`;
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';

      gallery.appendChild(img);
    });
  }

  const order = $('detailOrder');

  if (order) {
    order.href = makeWhatsAppLink(product);
    order.target = '_blank';
    order.rel = 'noopener noreferrer';
  }

  if ($('products')) $('products').hidden = true;
  if ($('categories')) $('categories').hidden = true;

  if (productDetail) {
    productDetail.hidden = false;
    productDetail.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  history.replaceState(
    { productId: product.id },
    '',
    `#product-${encodeURIComponent(product.id ?? product.name ?? '')}`
  );
}

function closeProduct() {
  if (productDetail) productDetail.hidden = true;
  if ($('products')) $('products').hidden = false;
  if ($('categories')) $('categories').hidden = false;

  const heading = $('productsHeading');

  if (heading) heading.textContent = 'محصولات لئو لایت';

  history.replaceState({}, '', '#products');

  $('products')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

backToProducts?.addEventListener('click', closeProduct);

async function loadProducts() {
  if (productList) {
    productList.replaceChildren(
      createElement('p', 'loading-message', 'در حال دریافت محصولات...')
    );
  }

  try {
    const response = await fetch('./products.json', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        `دریافت products.json ناموفق بود: ${response.status}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        'ساختار products.json باید آرایه‌ای از محصولات باشد.'
      );
    }

    allProducts = data.filter(
      (product) => product && product.published !== false
    );

    if (!allProducts.length) {
      throw new Error('محصول منتشرشده‌ای در فایل پیدا نشد.');
    }

    renderCategories();
    renderProducts();

    const footerWhatsApp = $('footerWhatsApp');

    if (footerWhatsApp) {
      footerWhatsApp.href =
        `https://wa.me/${WHATSAPP_NUMBER}?text=` +
        encodeURIComponent(
          'سلام، برای دریافت اطلاعات محصولات لئو لایت پیام می‌دهم.'
        );
    }
  } catch (error) {
    console.error('خطا در بارگذاری محصولات:', error);

    if (productList) {
      productList.replaceChildren(
        createElement(
          'p',
          'empty-message',
          'محصولات بارگذاری نشدند. بررسی کن products.json کنار index.html باشد و سایت از طریق Live Server اجرا شود.'
        )
      );
    }

    if (categoryList) {
      categoryList.replaceChildren(
        createElement(
          'p',
          'empty-message',
          'دسته‌بندی‌ها بارگذاری نشدند.'
        )
      );
    }

    if (productCount) productCount.textContent = '';
    if (loadMoreButton) loadMoreButton.hidden = true;
  }
}

loadProducts();