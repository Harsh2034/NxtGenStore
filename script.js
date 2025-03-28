let cart = [];
let allProducts = [];
let lastRecommendationTime = 0;
const COOLDOWN_TIME = 120000;
let currentOrderId = null;

const saleEndTime = new Date().getTime() + 24 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', () => {
    fetch('http://localhost:3000/check-session', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.isLoggedIn) {
            document.getElementById('auth-button').innerText = 'Logout';
            document.getElementById('auth-button').onclick = logout;
            document.getElementById('my-orders-button').style.display = 'inline-block';
            document.getElementById('change-password-button').style.display = 'inline-block';
            document.getElementById('signup-button').style.display = 'none';
        } else {
            document.getElementById('signup-button').style.display = 'inline-block';
        }
    })
    .catch(error => console.error('Error checking session:', error));

    fetch('http://localhost:3000/products', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.message && data.message.includes('Error')) {
            throw new Error(data.message);
        }
        allProducts = data;
        console.log("All Products:", allProducts);
        if (allProducts.length === 0) {
            console.warn("No products found in the database.");
            document.getElementById('best-sellers-list').innerHTML = '<p>No products available.</p>';
            document.getElementById('lightning-sale-list').innerHTML = '<p>No products available.</p>';
            document.getElementById('product-list').innerHTML = '<p>No products available.</p>';
            document.getElementById('random-product').innerHTML = '<p>No products available.</p>';
            return;
        }
        filterProducts();
        displayBestSellers();
        displayLightningSale();
        const randomProductDiv = document.getElementById('random-product');
        randomProductDiv.className = 'random-product-card empty';
        randomProductDiv.innerHTML = '<p>Click "Get New Recommendation" to see a product!</p>';
    })
    .catch(error => {
        console.error("Error fetching products:", error);
        document.getElementById('best-sellers-list').innerHTML = `<p>Error loading products: ${error.message}</p>`;
        document.getElementById('lightning-sale-list').innerHTML = `<p>Error loading products: ${error.message}</p>`;
        document.getElementById('product-list').innerHTML = `<p>Error loading products: ${error.message}</p>`;
        document.getElementById('random-product').innerHTML = `<p>Error loading products: ${error.message}</p>`;
    });
});

function toggleCart() {
    const cartModal = document.getElementById('cart-modal');
    cartModal.classList.toggle('open');
}

function showRandomProduct() {
    const now = Date.now();
    const timeSinceLastRecommendation = now - lastRecommendationTime;

    if (timeSinceLastRecommendation < COOLDOWN_TIME) {
        const remainingTime = Math.ceil((COOLDOWN_TIME - timeSinceLastRecommendation) / 1000);
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        document.getElementById('cooldown-message').style.display = 'block';
        document.getElementById('cooldown-message').innerText = `New recommendation available in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        document.getElementById('new-recommendation').disabled = true;

        const countdownInterval = setInterval(() => {
            const timeLeft = Math.ceil((COOLDOWN_TIME - (Date.now() - lastRecommendationTime)) / 1000);
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                document.getElementById('cooldown-message').style.display = 'none';
                document.getElementById('new-recommendation').disabled = false;
            } else {
                const mins = Math.floor(timeLeft / 60);
                const secs = timeLeft % 60;
                document.getElementById('cooldown-message').innerText = `New recommendation available in ${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }
        }, 1000);
        return;
    }

    lastRecommendationTime = now;
    document.getElementById('cooldown-message').style.display = 'none';
    document.getElementById('new-recommendation').disabled = false;

    const randomProductDiv = document.getElementById('random-product');
    if (allProducts.length === 0) {
        randomProductDiv.className = 'random-product-card empty';
        randomProductDiv.innerHTML = '<p>No products available.</p>';
        return;
    }

    const randomIndex = Math.floor(Math.random() * allProducts.length);
    const product = allProducts[randomIndex];

    randomProductDiv.className = 'random-product-card';
    randomProductDiv.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <p>Price: ₹${product.price}</p>
        <p class="product-rating">Rating: ${getStarRating(product.rating)}</p>
        <button onclick="addToCart('${product.name}', ${product.price}, this)">Add to Cart</button>
    `;

    randomProductDiv.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON') {
            showDetails(product);
        }
    };

    randomProductDiv.classList.remove('slide-in');
    setTimeout(() => {
        randomProductDiv.classList.add('slide-in');
    }, 10);
}

function displayBestSellers() {
    const bestSellersList = document.getElementById('best-sellers-list');
    const bestSellers = [...allProducts].sort((a, b) => b.rating - a.rating).slice(0, 4);
    bestSellersList.innerHTML = '';
    bestSellers.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'sale-product';
        productDiv.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="product-desc">${product.description}</p>
            <p>Price: ₹${product.price}</p>
            <p class="product-rating">Rating: ${getStarRating(product.rating)}</p>
            <button onclick="addToCart('${product.name}', ${product.price}, this)">Add to Cart</button>
        `;
        productDiv.onclick = () => showDetails(product);
        productDiv.querySelector('button').onclick = (e) => {
            e.stopPropagation();
            addToCart(product.name, product.price, e.target);
        };
        bestSellersList.appendChild(productDiv);
    });
}

function displayLightningSale() {
    const lightningSaleList = document.getElementById('lightning-sale-list');
    const shuffledProducts = [...allProducts].sort(() => 0.5 - Math.random());
    const saleProducts = shuffledProducts.slice(0, 4).map(product => ({
        ...product,
        originalPrice: product.price,
        discountedPrice: Math.round(product.price * 0.8),
    }));
    lightningSaleList.innerHTML = '';
    saleProducts.forEach((product, index) => {
        const productDiv = document.createElement('div');
        productDiv.className = 'sale-product';
        const limitedStock = Math.random() > 0.5 ? '<span class="limited-stock">Limited Stock</span>' : '';
        productDiv.innerHTML = `
            <div class="countdown-timer" id="timer-${index}"></div>
            ${limitedStock}
            <img src="${product.image}" alt="${product.name}">
            <h3 class="slide-in-text">${product.name}</h3>
            <p class="product-desc">${product.description}</p>
            <div class="price-container">
                <span class="original-price">₹${product.originalPrice}</span>
                <span class="discounted-price">₹${product.discountedPrice}</span>
            </div>
            <p class="product-rating">Rating: ${getStarRating(product.rating)}</p>
            <button onclick="addToCart('${product.name}', ${product.discountedPrice}, this)">Add to Cart</button>
        `;
        productDiv.onclick = () => showDetails(product);
        productDiv.querySelector('button').onclick = (e) => {
            e.stopPropagation();
            addToCart(product.name, product.discountedPrice, e.target);
        };
        lightningSaleList.appendChild(productDiv);
        startCountdownTimer(index);
    });
}

function startCountdownTimer(index) {
    const timerElement = document.getElementById(`timer-${index}`);
    const updateTimer = () => {
        const now = new Date().getTime();
        const timeLeft = saleEndTime - now;

        if (timeLeft <= 0) {
            timerElement.innerText = 'Sale Ended';
            return;
        }

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timerElement.innerText = `${hours}h ${minutes}m ${seconds}s`;
    };

    updateTimer();
    setInterval(updateTimer, 1000);
}

let slideIndex = 0;
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;

function showSlide(index) {
    if (index >= totalSlides) slideIndex = 0;
    if (index < 0) slideIndex = totalSlides - 1;
    const slidesContainer = document.querySelector('.slides');
    slidesContainer.style.transform = `translateX(-${slideIndex * 100}%)`;
}

function changeSlide(n) {
    slideIndex += n;
    showSlide(slideIndex);
}

setInterval(() => {
    slideIndex++;
    showSlide(slideIndex);
}, 4000);

showSlide(slideIndex);

function addToCart(name, price, buttonElement) {
    const productCard = buttonElement.closest('.product') || buttonElement.closest('.random-product-card') || buttonElement.closest('.sale-product');
    const productImage = productCard.querySelector('img');
    const cartIcon = document.querySelector('.cart-icon');
    const cartRect = cartIcon.getBoundingClientRect();

    const flyingElement = document.createElement('img');
    flyingElement.src = productImage.src;
    flyingElement.style.width = '50px';
    flyingElement.style.height = '50px';
    flyingElement.style.position = 'absolute';
    flyingElement.style.zIndex = '1000';
    flyingElement.style.left = productImage.getBoundingClientRect().left + 'px';
    flyingElement.style.top = productImage.getBoundingClientRect().top + 'px';
    document.body.appendChild(flyingElement);

    document.documentElement.style.setProperty('--cart-icon-x', `${cartRect.left + window.scrollX}px`);
    document.documentElement.style.setProperty('--cart-icon-y', `${cartRect.top + window.scrollY}px`);
    flyingElement.classList.add('fly-to-cart');

    setTimeout(() => {
        flyingElement.remove();
    }, 1200);

    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name: name, price: price, quantity: 1 });
    }
    updateCart();
}

function increaseQuantity(index) {
    cart[index].quantity += 1;
    updateCart();
}

function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
        updateCart();
    } else {
        const cartItem = document.getElementById('cart-items').children[index];
        cartItem.classList.add('fade-out');
        setTimeout(() => {
            cart.splice(index, 1);
            updateCart();
        }, 500);
    }
}

function removeFromCart(index) {
    const cartItem = document.getElementById('cart-items').children[index];
    cartItem.classList.add('fade-out');
    setTimeout(() => {
        cart.splice(index, 1);
        updateCart();
    }, 500);
}

function clearCart() {
    const cartItems = document.getElementById('cart-items');
    Array.from(cartItems.children).forEach(item => {
        item.classList.add('fade-out');
    });
    setTimeout(() => {
        cart = [];
        updateCart();
    }, 500);
}

function proceedToCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty! Add some products first.");
        return;
    }

    const paymentMethod = document.getElementById('payment-method').value;
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (paymentMethod === 'cod') {
        // Open COD confirmation modal
        document.getElementById('cod-total').innerText = total;
        const codModal = document.getElementById('cod-confirmation-modal');
        codModal.classList.add('open');
    } else {
        alert('Selected payment method is not supported yet.');
    }
}

function confirmCODOrder() {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const paymentMethod = document.getElementById('payment-method').value;

    fetch('http://localhost:3000/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: cart,
            total: total,
            paymentMethod: paymentMethod
        }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Order placed successfully') {
            const popup = document.getElementById('order-success-popup');
            popup.style.display = 'block';
            popup.classList.add('popup-appear');
            document.getElementById('overlay').style.display = 'block';
            cart = [];
            updateCart();
            toggleCart();
            closeCODConfirmationModal();
        } else {
            alert(data.message);
            closeCODConfirmationModal();
        }
    })
    .catch(error => {
        console.error('Error placing order:', error);
        alert('Error placing order');
        closeCODConfirmationModal();
    });
}

function closeCODConfirmationModal() {
    const codModal = document.getElementById('cod-confirmation-modal');
    codModal.classList.remove('open');
}

function closeOrderPopup() {
    const popup = document.getElementById('order-success-popup');
    popup.classList.remove('popup-appear');
    popup.classList.add('popup-disappear');
    setTimeout(() => {
        popup.style.display = 'none';
        popup.classList.remove('popup-disappear');
        document.getElementById('overlay').style.display = 'none';
    }, 300);
}

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <div class="cart-item-details">
                ${item.name} - ₹${item.price * item.quantity}
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="decreaseQuantity(${index})">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="increaseQuantity(${index})">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
        `;
        itemDiv.classList.add('fade-in');
        cartItems.appendChild(itemDiv);
    });

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById('cart-total').innerText = `Total: ₹${total}`;
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElement = document.getElementById('cart-count');
    cartCountElement.innerText = cartCount;
    if (cartCount > 0) {
        cartCountElement.classList.add('scale-bounce');
    }
}

function getStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars += '<span class="star full">★</span>';
        } else if (i === fullStars && hasHalfStar) {
            stars += '<span class="star half">★</span>';
        } else {
            stars += '<span class="star empty">★</span>';
        }
    }
    return stars;
}

function filterProducts() {
    const searchQuery = document.getElementById('search-bar').value.toLowerCase();
    const priceFilter = document.getElementById('filter-price').value;
    const categoryFilter = document.getElementById('filter-category').value;

    let filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery);
        let matchesPrice = true;
        if (priceFilter === 'under-5000') {
            matchesPrice = product.price < 5000;
        } else if (priceFilter === '5000-20000') {
            matchesPrice = product.price >= 5000 && product.price <= 20000;
        } else if (priceFilter === 'above-20000') {
            matchesPrice = product.price > 20000;
        }
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesPrice && matchesCategory;
    });

    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    filteredProducts.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product';
        productDiv.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="product-desc">${product.description}</p>
            <p>Price: ₹${product.price}</p>
            <p class="product-rating">Rating: ${getStarRating(product.rating)}</p>
            <button onclick="addToCart('${product.name}', ${product.price}, this)">Add to Cart</button>
        `;
        productDiv.onclick = () => showDetails(product);
        productDiv.querySelector('button').onclick = (e) => {
            e.stopPropagation();
            addToCart(product.name, product.price, e.target);
        };
        productList.appendChild(productDiv);
    });
}

function showDetails(product) {
    const detailsDiv = document.getElementById('product-details');
    document.getElementById('detail-name').innerText = product.name;
    document.getElementById('detail-image').src = product.image;
    document.getElementById('detail-desc').innerText = product.description;
    document.getElementById('detail-price').innerText = `Price: ₹${product.price}`;
    document.getElementById('overlay').style.display = 'block';
    detailsDiv.style.display = 'block';
}

function hideDetails() {
    document.getElementById('product-details').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

function openMyOrders() {
    fetch('http://localhost:3000/my-orders', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(orders => {
        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = '';
        if (orders.length === 0) {
            ordersList.innerHTML = '<p>No orders found.</p>';
        } else {
            orders.forEach(order => {
                const orderDiv = document.createElement('div');
                orderDiv.className = 'order-item';
                let itemsHtml = '';
                order.items.forEach(item => {
                    itemsHtml += `
                        <div class="order-item-details">
                            <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: contain; margin-right: 10px;">
                            <span>${item.name} - ₹${item.price} x ${item.quantity}</span>
                        </div>
                    `;
                });
                orderDiv.innerHTML = `
                    <h3>Order Date: ${new Date(order.orderDate).toLocaleString()}</h3>
                    <div class="order-items">${itemsHtml}</div>
                    <p>Total: ₹${order.total}</p>
                    <p>Status: ${order.status}</p>
                    <p>Payment Method: ${order.paymentMethod || 'Not specified'}</p>
                    <button class="track-order-btn" onclick="trackOrder('${order._id}')">Track Order</button>
                    ${order.status === 'Processing' ? `<button class="cancel-order-btn" onclick="cancelOrder('${order._id}')">Cancel Order</button>` : ''}
                `;
                ordersList.appendChild(orderDiv);
            });
        }
        const ordersModal = document.getElementById('orders-modal');
        ordersModal.classList.add('open');
    })
    .catch(error => {
        console.error('Error fetching orders:', error);
        alert('Error fetching orders');
    });
}

function closeMyOrders() {
    const ordersModal = document.getElementById('orders-modal');
    ordersModal.classList.remove('open');
}

function openCancelOrderModal(orderId) {
    currentOrderId = orderId;
    const cancelModal = document.getElementById('cancel-order-modal');
    cancelModal.classList.add('open');
}

function closeCancelOrderModal() {
    const cancelModal = document.getElementById('cancel-order-modal');
    cancelModal.classList.remove('open');
    currentOrderId = null;
}

function confirmCancelOrder() {
    if (!currentOrderId) {
        alert('No order selected to cancel.');
        return;
    }

    fetch('http://localhost:3000/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: currentOrderId }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Order canceled successfully') {
            alert('Order canceled successfully!');
            closeCancelOrderModal();
            openMyOrders();
        } else {
            alert(data.message);
            closeCancelOrderModal();
        }
    })
    .catch(error => {
        console.error('Error canceling order:', error);
        alert('Error canceling order');
        closeCancelOrderModal();
    });
}

function cancelOrder(orderId) {
    openCancelOrderModal(orderId);
}

function trackOrder(orderId) {
    alert(`Tracking for order ${orderId} is not yet implemented. Coming soon!`);
}

function openLoginModal() {
    document.getElementById('login-modal').classList.add('open');
    document.getElementById('signup-modal').classList.remove('open');
    document.getElementById('forgot-password-modal').classList.remove('open');
    document.getElementById('change-password-modal').classList.remove('open');
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.remove('open');
}

function openSignupModal() {
    document.getElementById('signup-modal').classList.add('open');
    document.getElementById('login-modal').classList.remove('open');
    document.getElementById('forgot-password-modal').classList.remove('open');
    document.getElementById('change-password-modal').classList.remove('open');
}

function closeSignupModal() {
    document.getElementById('signup-modal').classList.remove('open');
}

function openForgotPasswordModal() {
    document.getElementById('forgot-password-modal').classList.add('open');
    document.getElementById('login-modal').classList.remove('open');
    document.getElementById('signup-modal').classList.remove('open');
    document.getElementById('change-password-modal').classList.remove('open');
}

function closeForgotPasswordModal() {
    document.getElementById('forgot-password-modal').classList.remove('open');
}

function openChangePasswordModal() {
    document.getElementById('change-password-modal').classList.add('open');
    document.getElementById('login-modal').classList.remove('open');
    document.getElementById('signup-modal').classList.remove('open');
    document.getElementById('forgot-password-modal').classList.remove('open');
}

function closeChangePasswordModal() {
    document.getElementById('change-password-modal').classList.remove('open');
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');

    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Login successful') {
            document.getElementById('auth-button').innerText = 'Logout';
            document.getElementById('auth-button').onclick = logout;
            document.getElementById('my-orders-button').style.display = 'inline-block';
            document.getElementById('change-password-button').style.display = 'inline-block';
            document.getElementById('signup-button').style.display = 'none';
            closeLoginModal();
        } else {
            errorElement.innerText = data.message;
        }
    })
    .catch(error => {
        console.error('Error during login:', error);
        errorElement.innerText = 'Error during login';
    });
}

function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorElement = document.getElementById('signup-error');

    fetch('http://localhost:3000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Signup successful') {
            document.getElementById('auth-button').innerText = 'Logout';
            document.getElementById('auth-button').onclick = logout;
            document.getElementById('my-orders-button').style.display = 'inline-block';
            document.getElementById('change-password-button').style.display = 'inline-block';
            document.getElementById('signup-button').style.display = 'none';
            closeSignupModal();
        } else {
            errorElement.innerText = data.message;
        }
    })
    .catch(error => {
        console.error('Error during signup:', error);
        errorElement.innerText = 'Error during signup';
    });
}

function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const newPassword = document.getElementById('forgot-new-password').value;
    const errorElement = document.getElementById('forgot-error');

    fetch('http://localhost:3000/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Password reset successful') {
            alert('Password reset successful! Please login with your new password.');
            closeForgotPasswordModal();
            openLoginModal();
        } else {
            errorElement.innerText = data.message;
        }
    })
    .catch(error => {
        console.error('Error during password reset:', error);
        errorElement.innerText = 'Error during password reset';
    });
}

function handleChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const errorElement = document.getElementById('change-password-error');

    fetch('http://localhost:3000/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Password changed successfully') {
            alert('Password changed successfully!');
            closeChangePasswordModal();
        } else {
            errorElement.innerText = data.message;
        }
    })
    .catch(error => {
        console.error('Error during password change:', error);
        errorElement.innerText = 'Error during password change';
    });
}

function logout() {
    fetch('http://localhost:3000/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Logout successful') {
            document.getElementById('auth-button').innerText = 'Login';
            document.getElementById('auth-button').onclick = openLoginModal;
            document.getElementById('my-orders-button').style.display = 'none';
            document.getElementById('change-password-button').style.display = 'none';
            document.getElementById('signup-button').style.display = 'inline-block';
            closeMyOrders();
        }
    })
    .catch(error => console.error('Error during logout:', error));
}