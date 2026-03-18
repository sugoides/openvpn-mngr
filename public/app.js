document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api';

    /**
     * A global fetch wrapper to handle API requests and authentication errors.
     * @param {string} url - The URL to fetch.
     * @param {object} options - The fetch options.
     * @returns {Promise<Response>}
     */
    async function apiFetch(url, options = {}) {
        const response = await fetch(url, options);
        if (response.status === 401) {
            // Unauthorized, redirect to login page
            window.location.href = '/login.html';
            throw new Error('Authentication required.');
        }
        return response;
    }

    // Page-specific logic
    if (window.location.pathname.endsWith('login.html')) {
        handleLoginPage();
    } else if (window.location.pathname.endsWith('dashboard.html')) {
        handleDashboardPage();
    }

    function handleLoginPage() {
        const loginForm = document.getElementById('login-form');
        const errorContainer = document.getElementById('error-container');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitButton = loginForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Signing In...';
            errorContainer.textContent = '';

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Login failed.');
                }

                window.location.href = '/dashboard.html';
            } catch (error) {
                errorContainer.textContent = error.message;
                submitButton.disabled = false;
                submitButton.textContent = 'Sign In';
            }
        });
    }

    function handleDashboardPage() {
        const userTableBody = document.getElementById('user-table-body');
        const loadingSpinner = document.getElementById('loading-spinner');
        const alertContainer = document.getElementById('alert-container');
        const grantModal = document.getElementById('grant-modal');
        const grantAccessBtn = document.getElementById('grant-access-btn');
        const grantForm = document.getElementById('grant-form');
        const extendModal = document.getElementById('extend-modal');
        const extendForm = document.getElementById('extend-form');
        const extendUsernameDisplay = document.getElementById('extend-username-display');
        const extendUsernameInput = document.getElementById('extend-username');
        const logoutBtn = document.getElementById('logout-btn');
        const confirmActionModal = document.getElementById('confirm-action-modal');
        const confirmModalTitle = document.getElementById('confirm-modal-title');
        const confirmModalBody = document.getElementById('confirm-modal-body');
        let confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');

        function showAlert(message, type = 'success') {
            const alert = document.createElement('div');
            const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
            alert.className = `${bgColor} text-white font-bold rounded-lg px-4 py-3 shadow-md`;
            alert.textContent = message;
            alertContainer.appendChild(alert);
            setTimeout(() => alert.remove(), 3000);
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        }

        function getTimeRemaining(expirationDate) {
            if (!expirationDate) return 'N/A';
            const now = new Date();
            const expiration = new Date(expirationDate);
            const diff = expiration - now;

            if (diff <= 0) return 'Expired';

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);

            if (days > 0) return `${days}d ${hours}h`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
        }

        function renderTable(users) {
            userTableBody.innerHTML = '';
            if (users.length === 0) {
                userTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No users found.</td></tr>';
                return;
            }

            users.forEach(user => {
                const statusColors = {
                    active: 'bg-green-200 text-green-800',
                    blocked: 'bg-red-200 text-red-800',
                    expired: 'bg-yellow-200 text-yellow-800',
                };

                let actionButton;
                if (user.status === 'blocked') {
                    actionButton = `<button data-username="${user.username}" class="unblock-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded">Unblock</button>`;
                } else {
                    actionButton = `<button data-username="${user.username}" class="block-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Block</button>`;
                }

                const row = document.createElement('tr');
                row.className = 'border-b border-gray-200 hover:bg-gray-100';
                row.innerHTML = `
                    <td class="py-3 px-6 text-left whitespace-nowrap">${user.username}</td>
                    <td class="py-3 px-6 text-left"><span class="${statusColors[user.status] || ''} py-1 px-3 rounded-full text-xs">${user.status}</span></td>
                    <td class="py-3 px-6 text-center">${formatDate(user.expiration_date)}</td>
                    <td class="py-3 px-6 text-center">${getTimeRemaining(user.expiration_date)}</td>
                    <td class="py-3 px-6 text-center">
                        <div class="flex item-center justify-center">
                            <button data-username="${user.username}" data-expiration="${user.expiration_date}" class="extend-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mr-2">Extend</button>
                            ${actionButton}
                        </div>
                    </td>
                `;
                userTableBody.appendChild(row);
            });
        }

        async function fetchUsers() {
            loadingSpinner.style.display = 'block';
            try {
                const response = await apiFetch(`${API_BASE_URL}/users`);
                if (!response.ok) throw new Error('Failed to fetch users');
                const users = await response.json();
                renderTable(users);
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                loadingSpinner.style.display = 'none';
            }
        }

        function openModal(modal) { modal.classList.add('active'); }
        function closeModal(modal) { modal.classList.remove('active'); }

        function openConfirmModal({ title, body, confirmText, confirmClasses, onConfirm }) {
            confirmModalTitle.textContent = title;
            confirmModalBody.textContent = body;
            
            const newConfirmBtn = confirmModalConfirmBtn.cloneNode(true);
            newConfirmBtn.textContent = confirmText;
            newConfirmBtn.className = `font-bold py-2 px-4 rounded-lg ${confirmClasses}`;
            confirmModalConfirmBtn.parentNode.replaceChild(newConfirmBtn, confirmModalConfirmBtn);
            
            confirmModalConfirmBtn = newConfirmBtn;
            
            const handleConfirm = () => {
                onConfirm();
                closeModal(confirmActionModal);
            };

            confirmModalConfirmBtn.addEventListener('click', handleConfirm, { once: true });
            
            openModal(confirmActionModal);
        }

        grantAccessBtn.addEventListener('click', () => openModal(grantModal));
        document.querySelectorAll('.modal-cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal(grantModal);
                closeModal(extendModal);
                closeModal(confirmActionModal);
            });
        });

        logoutBtn.addEventListener('click', async () => {
            try {
                await apiFetch(`${API_BASE_URL}/logout`, { method: 'POST' });
                window.location.href = '/login.html';
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });

        grantForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(grantForm);
            const data = Object.fromEntries(formData.entries());
            data.expiration_date = new Date(data.expiration_date).toISOString();
            const submitButton = grantForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'Granting...';

            try {
                const response = await apiFetch(`${API_BASE_URL}/users/grant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to grant access.');
                }
                await response.json();
                showAlert('Access granted successfully!');
                closeModal(grantModal);
                fetchUsers();
                grantForm.reset();
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Grant Access';
            }
        });

        extendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(extendForm);
            const data = Object.fromEntries(formData.entries());
            data.expiration_date = new Date(data.expiration_date).toISOString();
            const submitButton = extendForm.querySelector('button[type="submit"]');
            
            submitButton.disabled = true;
            submitButton.textContent = 'Extending...';

            try {
                const response = await apiFetch(`${API_BASE_URL}/users/extend`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to extend access.');
                }
                await response.json();
                showAlert('Access extended successfully!');
                closeModal(extendModal);
                fetchUsers();
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Extend Access';
            }
        });

        userTableBody.addEventListener('click', async (e) => {
            const extendButton = e.target.closest('.extend-btn');
            if (extendButton) {
                const username = extendButton.dataset.username;
                extendUsernameDisplay.textContent = username;
                extendUsernameInput.value = username;
                openModal(extendModal);
            }

            const unblockButton = e.target.closest('.unblock-btn');
            if (unblockButton) {
                const username = unblockButton.dataset.username;
                openConfirmModal({
                    title: 'Unblock User',
                    body: `Are you sure you want to unblock ${username}?`,
                    confirmText: 'Unblock',
                    confirmClasses: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                    onConfirm: async () => {
                        unblockButton.disabled = true;
                        try {
                            const response = await apiFetch(`${API_BASE_URL}/users/unblock`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username }),
                            });
                            if (!response.ok) {
                                const err = await response.json();
                                throw new Error(err.error || 'Failed to unblock user.');
                            }
                            await response.json();
                            showAlert('User unblocked successfully!');
                            fetchUsers();
                        } catch (error) {
                            showAlert(error.message, 'error');
                        } finally {
                            unblockButton.disabled = false;
                        }
                    }
                });
            }

            const blockButton = e.target.closest('.block-btn');
            if (blockButton) {
                const username = blockButton.dataset.username;
                openConfirmModal({
                    title: 'Block User',
                    body: `Are you sure you want to block ${username}?`,
                    confirmText: 'Block',
                    confirmClasses: 'bg-red-500 hover:bg-red-600 text-white',
                    onConfirm: async () => {
                        blockButton.disabled = true;
                        try {
                            const response = await apiFetch(`${API_BASE_URL}/users/block`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username }),
                            });
                            if (!response.ok) {
                                const err = await response.json();
                                throw new Error(err.error || 'Failed to block user.');
                            }
                            await response.json();
                            showAlert('User blocked successfully!');
                            fetchUsers();
                        } catch (error) {
                            showAlert(error.message, 'error');
                        } finally {
                            blockButton.disabled = false;
                        }
                    }
                });
            }
        });

        fetchUsers();
    }
});
