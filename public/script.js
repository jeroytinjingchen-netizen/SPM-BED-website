        // Simulated local storage user data schema instantiation
        if (!localStorage.getItem('hawker_users')) {
            localStorage.setItem('hawker_users', JSON.stringify([]));
        }

        // Global Application State Trackers
        let currentUser = null;

        // View Router Controller Engine
        function navigateTo(viewId) {
            // Guard Rule Simulation (Route Protection Criteria validation)
            const restrictedPages = ['dashboard-view'];
            if (restrictedPages.includes(viewId) && !currentUser) {
                const loginAlert = document.getElementById('login-alert');
                loginAlert.className = "alert alert-danger";
                loginAlert.innerText = "Access Denied. Please log into an active profile first.";
                loginAlert.style.display = "block";
                navigateTo('login-view');
                return;
            }

            // Clear all structural views
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
            });

            // Toggle selected layout block
            document.getElementById(viewId).classList.add('active');
            window.scrollTo(0, 0);
        }

        // Account Registration Handler Engine
        function handleRegistration(e) {
            e.preventDefault();
            const alertBox = document.getElementById('register-alert');
            alertBox.style.display = "none";

            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const role = document.getElementById('reg-role').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm').value;

            // Password length rule evaluation
            if (password.length < 8) {
                showAlert(alertBox, "danger", "Password validation failed: Must be at least 8 characters long.");
                return;
            }

            // Password validation equality verification check
            if (password !== confirmPassword) {
                showAlert(alertBox, "danger", "Validation error: Input fields do not match.");
                return;
            }

            let users = JSON.parse(localStorage.getItem('hawker_users'));

            // Check Duplicate Accounts Criteria constraint
            if (users.find(u => u.email === email)) {
                showAlert(alertBox, "danger", "Registration Blocked: Email string is already linked to another user account.");
                return;
            }

            // Add clean record payload (Simulating secure hashing save state entry context)
            users.push({ name, email, role, password: btoa(password) }); // btoa simulates simple basic password obfuscation encoding
            localStorage.setItem('hawker_users', JSON.stringify(users));

            // Reset Registration form input elements
            document.getElementById('register-form').reset();

            // Set login feedback notification text configuration context parameters
            const loginAlert = document.getElementById('login-alert');
            showAlert(loginAlert, "success", "Registration successful! You may now sign in using your credentials.");
            navigateTo('login-view');
        }

        // User Login Authentication Engine
        function handleLogin(e) {
            e.preventDefault();
            const alertBox = document.getElementById('login-alert');
            alertBox.style.display = "none";

            const email = document.getElementById('login-email').value.trim().toLowerCase();
            const password = btoa(document.getElementById('login-password').value);

            const users = JSON.parse(localStorage.getItem('hawker_users'));
            const matchedUser = users.find(u => u.email === email && u.password === password);

            if (!matchedUser) {
                // Return vague error messages strings parsing context parameters (Security compliance constraint mapping)
                showAlert(alertBox, "danger", "Invalid email or password.");
                return;
            }

            // Success authentication entry state management allocation tracking mapping
            currentUser = matchedUser;
            document.getElementById('user-display-name').innerText = currentUser.name;
            document.getElementById('user-display-role').innerText = currentUser.role;
            
            document.getElementById('login-form').reset();
            updateNavigationUI(true);
            navigateTo('dashboard-view');
        }

        // Logout Session Termination Engine
        function handleLogout() {
            currentUser = null;
            updateNavigationUI(false);
            navigateTo('landing-view');
        }

        // Context Utility Alert Box Presenter Script
        function showAlert(element, type, message) {
            element.className = `alert alert-${type}`;
            element.innerText = message;
            element.style.display = "block";
        }

        // Dynamic Nav Items Display Synchronization Renderer Layout Engine
        function updateNavigationUI(isLoggedIn) {
            const menu = document.getElementById('nav-menu');
            if (isLoggedIn) {
                menu.innerHTML = `
                    <li><a onclick="navigateTo('dashboard-view')">Dashboard</a></li>
                    <li><a onclick="handleLogout()" class="btn-primary">Log Out</a></li>
                `;
            } else {
                menu.innerHTML = `
                    <li><a onclick="navigateTo('landing-view')">Home</a></li>
                    <li><a onclick="navigateTo('login-view')">Log In</a></li>
                    <li><a onclick="navigateTo('register-view')" class="btn-primary">Register</a></li>
                `;
            }
        }