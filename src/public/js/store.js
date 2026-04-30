(function () {
  const CART_KEY = 'mrrouben_cart';

  const getCart = function () {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const saveCart = function (cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  };

  const formatCurrency = function (amount) {
    return '$' + Number(amount).toLocaleString('es-AR');
  };

  const updateCartCount = function () {
    const cart = getCart();
    const count = cart.reduce(function (acc, item) {
      return acc + item.quantity;
    }, 0);

    const countEl = document.getElementById('cart-count');
    if (countEl) {
      countEl.textContent = String(count);
    }
  };

  const setButtonLoading = function (btn, isLoading) {
    if (!btn) {
      return;
    }
    if (isLoading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = btn.dataset.loading || 'Procesando...';
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  };

  // Protege todos los formularios nativos (POST con redirect) contra spam
  const bindFormLoadingStates = function () {
    document.querySelectorAll('form').forEach(function (form) {
      // El checkout es manejado por su propio handler async
      if (form.id === 'checkout-form') {
        return;
      }
      form.addEventListener('submit', function () {
        var submitBtn = form.querySelector('[type="submit"]');
        setButtonLoading(submitBtn, true);
      }, { once: true });
    });
  };

  const bindNavToggle = function () {
    const toggle = document.getElementById('nav-menu-toggle');
    const panel = document.getElementById('nav-panel');

    if (!toggle || !panel) {
      return;
    }

    toggle.addEventListener('click', function () {
      const isOpen = panel.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  };

  const bindCatalogMenuToggle = function () {
    const toggle = document.getElementById('catalog-menu-toggle');
    const menu = document.getElementById('catalog-menu');

    if (!toggle || !menu) {
      return;
    }

    toggle.addEventListener('click', function () {
      const isCollapsed = menu.classList.toggle('is-collapsed');
      menu.classList.toggle('is-open', !isCollapsed);
      toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      toggle.textContent = isCollapsed ? 'Ver categorías' : 'Ocultar categorías';
    });
  };

  const bindAdminAccordion = function () {
    const sections = Array.from(document.querySelectorAll('.admin-accordion'));
    if (!sections.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const getBody = function (section) {
      return section.querySelector('.admin-grid');
    };

    const closeSection = function (section, instant) {
      const body = getBody(section);
      if (!body) {
        section.open = false;
        return;
      }

      if (instant || prefersReducedMotion) {
        section.open = false;
        body.style.height = '';
        body.style.opacity = '';
        body.style.overflow = '';
        return;
      }

      const startHeight = body.offsetHeight;
      body.style.overflow = 'hidden';
      body.style.height = startHeight + 'px';
      body.style.opacity = '1';

      const animation = body.animate(
        [
          { height: startHeight + 'px', opacity: 1 },
          { height: '0px', opacity: 0.22 }
        ],
        { duration: 220, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }
      );

      animation.onfinish = function () {
        section.open = false;
        body.style.height = '';
        body.style.opacity = '';
        body.style.overflow = '';
      };
    };

    const openSection = function (section, instant) {
      const body = getBody(section);
      section.open = true;

      if (!body) {
        return;
      }

      if (instant || prefersReducedMotion) {
        body.style.height = '';
        body.style.opacity = '';
        body.style.overflow = '';
        return;
      }

      const endHeight = body.scrollHeight;
      body.style.overflow = 'hidden';
      body.style.height = '0px';
      body.style.opacity = '0.22';

      const animation = body.animate(
        [
          { height: '0px', opacity: 0.22 },
          { height: endHeight + 'px', opacity: 1 }
        ],
        { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );

      animation.onfinish = function () {
        body.style.height = '';
        body.style.opacity = '';
        body.style.overflow = '';
      };
    };

    const initiallyOpen = sections.filter(function (section) {
      return section.open;
    });

    if (initiallyOpen.length > 1) {
      initiallyOpen.slice(1).forEach(function (section) {
        closeSection(section, true);
      });
    }

    sections.forEach(function (section) {
      const trigger = section.querySelector('.admin-section-banner');
      if (!trigger) {
        return;
      }

      trigger.addEventListener('click', function (event) {
        event.preventDefault();

        if (section.open) {
          closeSection(section, false);
          return;
        }

        sections.forEach(function (other) {
          if (other !== section && other.open) {
            closeSection(other, false);
          }
        });

        openSection(section, false);
      });
    });
  };

  const addToCart = function (button) {
    const id = button.dataset.productId;
    const name = button.dataset.productName;
    const price = Number(button.dataset.productPrice);

    if (!id || !name || !price) {
      return;
    }

    const cart = getCart();
    const existing = cart.find(function (item) {
      return item.productId === id;
    });

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        productId: id,
        name: name,
        unitPrice: price,
        quantity: 1
      });
    }

    saveCart(cart);
    updateCartCount();
    button.textContent = 'Agregado';
    setTimeout(function () {
      button.textContent = 'Agregar al carrito';
    }, 800);
  };

  const renderCheckout = function () {
    const container = document.getElementById('checkout-items');
    const totalEl = document.getElementById('checkout-total');
    const totalTopEl = document.getElementById('checkout-total-top');

    if (!container || !totalEl) {
      return;
    }

    const cart = getCart();

    if (!cart.length) {
      container.innerHTML = '<p>Tu carrito está vacío. Agrega productos desde el catálogo.</p>';
      totalEl.textContent = '$0';
      if (totalTopEl) {
        totalTopEl.textContent = '$0';
      }
      return;
    }

    let total = 0;
    container.innerHTML = '';

    cart.forEach(function (item) {
      total += item.unitPrice * item.quantity;

      const row = document.createElement('div');
      row.className = 'checkout-row';
      row.innerHTML =
        '<div><strong>' +
        item.name +
        '</strong><p>' +
        formatCurrency(item.unitPrice) +
        ' x ' +
        item.quantity +
        '</p></div>' +
        '<div class="checkout-actions">' +
        '<button type="button" data-action="dec" data-id="' +
        item.productId +
        '">-</button>' +
        '<button type="button" data-action="inc" data-id="' +
        item.productId +
        '">+</button>' +
        '<button type="button" data-action="remove" data-id="' +
        item.productId +
        '">Eliminar</button>' +
        '</div>';
      container.appendChild(row);
    });

    totalEl.textContent = formatCurrency(total);
    if (totalTopEl) {
      totalTopEl.textContent = formatCurrency(total);
    }

    container.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        if (!action || !id) {
          return;
        }

        const next = getCart();
        const target = next.find(function (item) {
          return item.productId === id;
        });

        if (!target) {
          return;
        }

        if (action === 'inc') {
          target.quantity += 1;
        }

        if (action === 'dec') {
          target.quantity -= 1;
        }

        if (action === 'remove' || target.quantity <= 0) {
          const filtered = next.filter(function (item) {
            return item.productId !== id;
          });
          saveCart(filtered);
        } else {
          saveCart(next);
        }

        updateCartCount();
        renderCheckout();
      });
    });
  };

  const bindCheckoutSubmit = function () {
    const form = document.getElementById('checkout-form');
    const feedback = document.getElementById('checkout-feedback');
    const submitBtn = document.getElementById('checkout-submit-btn');

    // --- Multi-step navigation ---
    const steps = [0, 1, 2];
    let currentStep = 0;

    const goToStep = function (step) {
      steps.forEach(function (s) {
        const el = document.getElementById('checkout-step-' + s);
        const li = document.querySelector('#checkout-steps [data-step="' + s + '"]');
        if (el) el.hidden = s !== step;
        if (li) {
          li.classList.remove('is-active', 'is-done');
          if (s === step) li.classList.add('is-active');
          if (s < step) li.classList.add('is-done');
        }
      });
      currentStep = step;
    };

    const step0Next = document.getElementById('step0-next');
    if (step0Next) {
      step0Next.addEventListener('click', function () {
        const cart = getCart();
        if (!cart.length) {
          alert('Tu carrito está vacío. Agregá productos antes de continuar.');
          return;
        }
        goToStep(1);
      });
    }

    const step1Back = document.getElementById('step1-back');
    if (step1Back) {
      step1Back.addEventListener('click', function () { goToStep(0); });
    }

    const step2Back = document.getElementById('step2-back');
    if (step2Back) {
      step2Back.addEventListener('click', function () { goToStep(1); });
    }

    // Delivery method toggle
    const deliveryRadios = document.querySelectorAll('input[name="deliveryMethod"]');
    const addressGroup = document.getElementById('delivery-address-group');
    deliveryRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (addressGroup) {
          addressGroup.hidden = radio.value !== 'delivery';
        }
      });
    });

    // Phone prefill
    if (form) {
      const registeredPhone = form.dataset.registeredPhone || '';
      const phoneInput = document.getElementById('customerPhone');
      const useRegisteredToggle = document.getElementById('useRegisteredPhone');

      if (phoneInput && registeredPhone) {
        phoneInput.value = registeredPhone;
      }

      if (useRegisteredToggle && phoneInput && registeredPhone) {
        useRegisteredToggle.addEventListener('change', function () {
          if (useRegisteredToggle.checked) phoneInput.value = registeredPhone;
        });
        phoneInput.addEventListener('input', function () {
          if (phoneInput.value !== registeredPhone) useRegisteredToggle.checked = false;
        });
      }
    }

    const step1Next = document.getElementById('step1-next');
    if (step1Next) {
      step1Next.addEventListener('click', function () {
        const phoneInput = document.getElementById('customerPhone');
        if (!phoneInput || !phoneInput.value.trim()) {
          phoneInput && phoneInput.focus();
          return;
        }
        // Render summary
        const cart = getCart();
        const deliveryRadio = document.querySelector('input[name="deliveryMethod"]:checked');
        const method = deliveryRadio ? deliveryRadio.value : 'pickup';
        const addressInput = document.getElementById('deliveryAddress');
        const address = method === 'delivery' && addressInput ? addressInput.value.trim() : '';

        if (method === 'delivery' && !address) {
          addressInput && addressInput.focus();
          return;
        }

        let summaryHtml = '<div class="checkout-summary-block">';
        summaryHtml += '<h3>Resumen</h3>';
        summaryHtml += '<p><strong>Entrega:</strong> ' + (method === 'delivery' ? 'Envío a domicilio' : 'Retiro en local') + '</p>';
        if (address) summaryHtml += '<p><strong>Dirección:</strong> ' + address + '</p>';
        summaryHtml += '<p><strong>Contacto:</strong> ' + phoneInput.value.trim() + '</p>';
        summaryHtml += '<hr style="border:none;border-top:1px solid var(--line-soft);margin:0.7rem 0">';
        let total = 0;
        cart.forEach(function (item) {
          total += item.unitPrice * item.quantity;
          summaryHtml += '<div class="checkout-row"><div><strong>' + item.name + '</strong><p>' + formatCurrency(item.unitPrice) + ' × ' + item.quantity + '</p></div><p>' + formatCurrency(item.unitPrice * item.quantity) + '</p></div>';
        });
        summaryHtml += '<p class="checkout-total">Total: <strong>' + formatCurrency(total) + '</strong></p>';
        summaryHtml += '</div>';

        const summaryEl = document.getElementById('checkout-summary');
        if (summaryEl) summaryEl.innerHTML = summaryHtml;

        goToStep(2);
      });
    }

    if (!submitBtn || !feedback) {
      return;
    }

    submitBtn.addEventListener('click', async function () {
      const cart = getCart();
      if (!cart.length) {
        feedback.textContent = 'El carrito está vacío.';
        feedback.className = 'form-error';
        return;
      }

      const phoneInput = document.getElementById('customerPhone');
      const deliveryRadio = document.querySelector('input[name="deliveryMethod"]:checked');
      const method = deliveryRadio ? deliveryRadio.value : 'pickup';
      const addressInput = document.getElementById('deliveryAddress');
      const address = method === 'delivery' && addressInput ? addressInput.value.trim() : '';
      const customerPhone = phoneInput ? phoneInput.value.trim() : '';

      const items = cart.map(function (item) {
        return { productId: item.productId, quantity: item.quantity };
      });

      setButtonLoading(submitBtn, true);

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items, customerPhone, deliveryMethod: method, deliveryAddress: address })
        });

        const data = await response.json();

        if (!response.ok) {
          feedback.textContent = data.message || 'No se pudo procesar la orden.';
          feedback.className = 'form-error';
          setButtonLoading(submitBtn, false);
          return;
        }

        localStorage.removeItem(CART_KEY);
        updateCartCount();
        window.location.href = '/pedido/' + data.order._id;
      } catch {
        feedback.textContent = 'Error de conexión. Intenta nuevamente.';
        feedback.className = 'form-error';
        setButtonLoading(submitBtn, false);
      }
    });
  };

  document.querySelectorAll('.js-add-to-cart').forEach(function (button) {
    button.addEventListener('click', function () {
      addToCart(button);
    });
  });

  updateCartCount();
  bindFormLoadingStates();
  bindNavToggle();
  bindCatalogMenuToggle();
  bindAdminAccordion();
  renderCheckout();
  bindCheckoutSubmit();
})();
