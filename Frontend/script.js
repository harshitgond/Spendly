// ================= DATA =================

let expenses = [];
let budget = 0;

const API_URL = "https://spendly-6bnh.onrender.com";

let authToken = localStorage.getItem("spendly_token");
let currentUsername = localStorage.getItem("spendly_username");

document.querySelector(".app").style.display = "none";


// ================= AUTH HELPER =================

async function authFetch(url, options = {}) {

    options.headers = {
        ...(options.headers || {}),
        "Authorization": `Bearer ${authToken}`
    };

    const response = await fetch(url, options);

    if (response.status === 401) {

        localStorage.removeItem("spendly_token");
        localStorage.removeItem("spendly_username");

        authToken = null;
        currentUsername = null;

        document.querySelector(".app").style.display = "none";
        document.getElementById("authScreen").style.display = "flex";

        throw new Error("Session expired");
    }

    return response;
}


// ================= LOGIN =================

document.getElementById("loginBtn").addEventListener(
    "click",
    async () => {

        const username =
            document.getElementById("loginUsername").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        const message =
            document.getElementById("authMessage");

        if (!username || !password) {
            message.textContent =
                "Please enter username and password.";
            return;
        }

        try {

            const response = await fetch(
                `${API_URL}/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                }
            );

            if (!response.ok) {

                const errorText =
                    await response.text();

                message.textContent =
                    errorText || "Login failed.";

                return;
            }

            const data =
                await response.json();

            authToken = data.token;
            currentUsername = data.username;

            localStorage.setItem(
                "spendly_token",
                authToken
            );

            localStorage.setItem(
                "spendly_username",
                currentUsername
            );

            document.getElementById(
                "authScreen"
            ).style.display = "none";

            document.querySelector(
                ".app"
            ).style.display = "";

            message.textContent = "";

            await loadDataFromBackend();

        }
        catch (error) {

            console.error(error);

            message.textContent =
                "Could not connect to backend.";
        }
    }
);


// ================= REGISTER =================

document.getElementById("registerBtn").addEventListener(
    "click",
    async () => {

        const username =
            document.getElementById("registerUsername").value.trim();

        const password =
            document.getElementById("registerPassword").value;

        const message =
            document.getElementById("authMessage");

        if (!username || !password) {

            message.textContent =
                "Please enter username and password.";

            return;
        }

        try {

            const response = await fetch(
                `${API_URL}/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                }
            );

            if (!response.ok) {

                const errorText =
                    await response.text();

                message.textContent =
                    errorText || "Registration failed.";

                return;
            }

            message.textContent =
                "Registration successful! Please login.";

            document.getElementById(
                "registerUsername"
            ).value = "";

            document.getElementById(
                "registerPassword"
            ).value = "";

            document.getElementById(
                "registerForm"
            ).style.display = "none";

            document.getElementById(
                "loginForm"
            ).style.display = "block";

        }
        catch (error) {

            console.error(error);

            message.textContent =
                "Could not connect to backend.";
        }
    }
);


// ================= SWITCH LOGIN / REGISTER =================

document.getElementById(
    "showRegister"
).addEventListener(
    "click",
    () => {

        document.getElementById(
            "loginForm"
        ).style.display = "none";

        document.getElementById(
            "registerForm"
        ).style.display = "block";

        document.getElementById(
            "authMessage"
        ).textContent = "";
    }
);


document.getElementById(
    "showLogin"
).addEventListener(
    "click",
    () => {

        document.getElementById(
            "registerForm"
        ).style.display = "none";

        document.getElementById(
            "loginForm"
        ).style.display = "block";

        document.getElementById(
            "authMessage"
        ).textContent = "";
    }
);


// ================= CHECK EXISTING LOGIN =================

async function checkAuth() {

    if (!authToken) {

        document.getElementById(
            "authScreen"
        ).style.display = "flex";

        return;
    }

    try {

        const response = await authFetch(
            `${API_URL}/me`
        );

        if (!response.ok) {
            throw new Error("Not logged in");
        }

        const user =
            await response.json();

        currentUsername =
            user.username;

        document.querySelector(
            ".app"
        ).style.display = "";

        document.getElementById(
            "authScreen"
        ).style.display = "none";

        await loadDataFromBackend();

    }
    catch (error) {

        localStorage.removeItem("spendly_token");
        localStorage.removeItem("spendly_username");

        authToken = null;

        document.querySelector(
            ".app"
        ).style.display = "none";

        document.getElementById(
            "authScreen"
        ).style.display = "flex";
    }
}

// ================= LOAD DATA FROM C++ BACKEND =================

async function loadDataFromBackend() {

    try {

        const [expensesResponse, budgetResponse] =
            await Promise.all([
                authFetch(`${API_URL}/expenses`),
                authFetch(`${API_URL}/budget`)
            ]);

        if (!expensesResponse.ok || !budgetResponse.ok) {
            throw new Error("Backend request failed");
        }

        expenses = await expensesResponse.json();

        const budgetData =
            await budgetResponse.json();

        budget = Number(budgetData.budget) || 0;

        renderDashboard();

    }
    catch (error) {

        console.error(error);

        alert(
            "C++ backend is not connected.\n\n" +
            "Please start main.exe first."
        );

    }

}


// ================= BACKEND API =================

async function addExpenseToBackend(expense) {

    const response =
        await authFetch(`${API_URL}/expenses`, {

            method: "POST",

            headers: {
                "Content-Type": "text/plain"
            },

            body: JSON.stringify(expense)

        });

    if (!response.ok) {
        throw new Error("Could not add expense");
    }

    return await response.json();

}


async function deleteExpenseFromBackend(id) {

    const response =
        await authFetch(
            `${API_URL}/expenses/${id}`,
            {
                method: "DELETE"
            }
        );

    if (!response.ok) {
        throw new Error("Could not delete expense");
    }

}


async function saveBudgetToBackend(value) {

    const response =
        await authFetch(
            `${API_URL}/budget`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "text/plain"
                },

                body: JSON.stringify({
                    budget: value
                })

            }
        );

    if (!response.ok) {
        throw new Error("Could not save budget");
    }

    return await response.json();

}


// ================= MONEY =================

function money(value) {

    return "₹" +
        Number(value).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        );

}


// ================= TOTAL =================

function getTotal() {

    return expenses.reduce(
        (total, expense) =>
            total + Number(expense.amount),
        0
    );

}


// ================= CATEGORY ICON =================

function categoryIcon(category) {

    const icons = {

        Food: "🍔",

        Travel: "🚌",

        Shopping: "🛍️",

        Education: "📚",

        Bills: "🧾",

        Entertainment: "🎬",

        Health: "💊",

        Other: "📌"

    };

    return icons[category] || "📌";

}


// ================= DATE =================

function formatDate(date) {

    if (!date) {
        return "";
    }

    return new Date(
        date + "T00:00:00"
    ).toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ================= CATEGORIES =================

function getCategories() {

    const data = {};

    expenses.forEach(
        expense => {

            const category =
                expense.category;

            data[category] =
                (data[category] || 0) +
                Number(expense.amount);

        }
    );

    return Object.entries(data)
        .sort(
            (a, b) =>
                b[1] - a[1]
        );

}


// ================= DASHBOARD =================

function renderDashboard() {

    const total =
        getTotal();

    const remaining =
        budget - total;


    document.getElementById(
        "totalSpent"
    ).textContent =
        money(total);


    document.getElementById(
        "monthlyBudget"
    ).textContent =
        budget > 0
            ? money(budget)
            : "₹0";


    document.getElementById(
        "remainingBudget"
    ).textContent =
        budget > 0
            ? money(
                Math.max(
                    remaining,
                    0
                )
            )
            : "₹0";


    document.getElementById(
        "transactionCount"
    ).textContent =
        expenses.length;


    document.getElementById(
        "budgetStatus"
    ).textContent =
        budget > 0
            ? "Monthly limit"
            : "Not set";


    document.getElementById(
        "remainingStatus"
    ).textContent =
        !budget
            ? "Set a budget"
            : remaining >= 0
                ? "Within budget"
                : "Budget exceeded";


    renderRecentExpenses();

    renderCategories();

    renderExpenses();

    renderAnalytics();

    renderInsights();

    renderBudget();

}


// ================= RECENT EXPENSES =================

function renderRecentExpenses() {

    const box =
        document.getElementById(
            "recentExpenses"
        );


    const recent =
        [...expenses]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            )
            .slice(0, 5);


    if (recent.length === 0) {

        box.innerHTML = `
            <div class="empty">
                No expenses yet.
                Add your first expense.
            </div>
        `;

        return;

    }


    box.innerHTML =
        recent
            .map(
                expense => {

                    return `

                    <div class="expense-row">

                        <div class="expense-left">

                            <div class="expense-icon">

                                ${categoryIcon(
                                    expense.category
                                )}

                            </div>

                            <div>

                                <div class="expense-name">

                                    ${escapeHTML(
                                        expense.description
                                    )}

                                </div>

                                <div class="expense-info">

                                    ${escapeHTML(
                                        expense.category
                                    )}

                                    ·

                                    ${formatDate(
                                        expense.date
                                    )}

                                </div>

                            </div>

                        </div>


                        <div class="expense-price">

                            ${money(
                                expense.amount
                            )}

                        </div>

                    </div>

                    `;

                }
            )
            .join("");

}


// ================= CATEGORY BREAKDOWN =================

function renderCategories() {

    const box =
        document.getElementById(
            "categoryBreakdown"
        );


    const categories =
        getCategories();


    if (categories.length === 0) {

        box.innerHTML = `
            <div class="empty">
                Add expenses to see
                your categories.
            </div>
        `;

        return;

    }


    const max =
        categories[0][1];


    box.innerHTML =
        categories
            .slice(0, 7)
            .map(
                ([category, total]) => {

                    const width =
                        (total / max) * 100;


                    return `

                    <div class="category-item">

                        <div class="category-head">

                            <span>

                                ${categoryIcon(
                                    category
                                )}

                                ${escapeHTML(
                                    category
                                )}

                            </span>


                            <strong>

                                ${money(total)}

                            </strong>

                        </div>


                        <div class="category-bar">

                            <div
                                class="category-fill"
                                style="width:${width}%">
                            </div>

                        </div>

                    </div>

                    `;

                }
            )
            .join("");

}


// ================= EXPENSE TABLE =================

function renderExpenses(search = "") {

    const box =
        document.getElementById(
            "allExpenses"
        );


    const filtered =
        [...expenses]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            )
            .filter(
                expense => {

                    const text =
                        (
                            expense.description +
                            " " +
                            expense.category +
                            " " +
                            expense.date
                        )
                            .toLowerCase();


                    return text.includes(
                        search.toLowerCase()
                    );

                }
            );


    if (filtered.length === 0) {

        box.innerHTML = `
            <div class="empty">
                No expenses found.
            </div>
        `;

        return;

    }


    box.innerHTML = `

        <table class="expense-table">

            <thead>

                <tr>

                    <th>DATE</th>

                    <th>CATEGORY</th>

                    <th>DESCRIPTION</th>

                    <th>AMOUNT</th>

                    <th></th>

                </tr>

            </thead>


            <tbody>

                ${filtered
                    .map(
                        expense => {

                            const index =
                                expenses.indexOf(
                                    expense
                                );


                            return `

                            <tr>

                                <td>

                                    ${formatDate(
                                        expense.date
                                    )}

                                </td>


                                <td>

                                    ${categoryIcon(
                                        expense.category
                                    )}

                                    ${escapeHTML(
                                        expense.category
                                    )}

                                </td>


                                <td>

                                    ${escapeHTML(
                                        expense.description
                                    )}

                                </td>


                                <td>

                                    <strong>

                                        ${money(
                                            expense.amount
                                        )}

                                    </strong>

                                </td>


                                <td>

                                    <button
                                        class="delete-btn"
                                        onclick="deleteExpense(${index})">

                                        Delete

                                    </button>

                                </td>

                            </tr>

                            `;

                        }
                    )
                    .join("")}

            </tbody>

        </table>

    `;

}


// ================= DELETE =================

async function deleteExpense(index) {

    if (
        !confirm(
            "Delete this expense?"
        )
    ) {

        return;

    }


    const expense =
        expenses[index];


    try {

        await deleteExpenseFromBackend(
            expense.id
        );


        expenses.splice(
            index,
            1
        );


        renderDashboard();

    }
    catch (error) {

        console.error(error);

        alert(
            "Could not delete expense."
        );

    }

}


// ================= ANALYTICS =================

function renderAnalytics() {

    const box =
        document.getElementById(
            "barChart"
        );


    const categories =
        getCategories();


    if (categories.length === 0) {

        box.innerHTML = `
            <div class="empty">
                Add expenses to generate
                analytics.
            </div>
        `;

        return;

    }


    const max =
        categories[0][1];


    box.innerHTML =
        categories
            .slice(0, 8)
            .map(
                ([category, total]) => {

                    const height =
                        Math.max(
                            (total / max) * 230,
                            5
                        );


                    return `

                    <div class="bar-item">

                        <span class="bar-value">

                            ${money(total)}

                        </span>


                        <div
                            class="bar"
                            style="height:${height}px">

                        </div>


                        <span class="bar-label">

                            ${escapeHTML(
                                category
                            )}

                        </span>

                    </div>

                    `;

                }
            )
            .join("");

}


// ================= INSIGHTS =================

function renderInsights() {

    const box =
        document.getElementById(
            "insights"
        );


    const categories =
        getCategories();


    const total =
        getTotal();


    if (total === 0) {

        box.innerHTML = `
            <div class="insight">

                📊 Your spending insights
                will appear here.

            </div>
        `;

        return;

    }


    const top =
        categories[0];


    const percentage =
        Math.round(
            (top[1] / total) * 100
        );


    const remaining =
        budget - total;


    let budgetMessage;


    if (!budget) {

        budgetMessage =
            "💡 Set a monthly budget to track your remaining money.";

    }

    else if (remaining >= 0) {

        budgetMessage =
            `✅ You are
            <strong>
                ${money(remaining)}
            </strong>
            under your budget.`;

    }

    else {

        budgetMessage =
            `⚠️ You are
            <strong>
                ${money(
                    Math.abs(remaining)
                )}
            </strong>
            over your budget.`;

    }


    box.innerHTML = `

        <div class="insight">

            🏆

            <strong>
                ${escapeHTML(top[0])}
            </strong>

            is your biggest category
            at ${money(top[1])}
            (${percentage}% of total).

        </div>


        <div class="insight">

            ${budgetMessage}

        </div>


        <div class="insight">

            🧾 You have recorded

            <strong>
                ${expenses.length}
            </strong>

            transaction(s).

        </div>

    `;

}


// ================= BUDGET =================

function renderBudget() {

    const total =
        getTotal();


    const remaining =
        budget - total;


    document.getElementById(
        "budgetInput"
    ).value =
        budget || "";


    document.getElementById(
        "budgetRemaining"
    ).textContent =
        budget
            ? money(
                Math.max(
                    remaining,
                    0
                )
            )
            : "₹0";


    document.getElementById(
        "budgetText"
    ).textContent =
        !budget
            ? "Set a budget to start tracking."

            : remaining >= 0

                ? `${money(total)}
                   spent out of
                   ${money(budget)}.`

                : `Budget exceeded by
                   ${money(
                       Math.abs(remaining)
                   )}.`;


    const percentage =
        budget
            ? Math.min(
                (total / budget) * 100,
                100
            )
            : 0;


    document.getElementById(
        "progressBar"
    ).style.width =
        percentage + "%";


    document.getElementById(
        "budgetRight"
    ).textContent =
        budget
            ? money(budget) + " budget"
            : "₹0 budget";

}


// ================= NAVIGATION =================

const navButtons =
    document.querySelectorAll(
        ".nav-btn"
    );


navButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const page =
                    button.dataset.page;


                showPage(page);

            }
        );

    }
);


function showPage(page) {

    document.querySelectorAll(
        ".page"
    ).forEach(
        section => {

            section.classList.remove(
                "active-page"
            );

        }
    );


    document.getElementById(
        page
    ).classList.add(
        "active-page"
    );


    navButtons.forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        }
    );


    document.getElementById(
        "pageTitle"
    ).textContent =
        page.charAt(0).toUpperCase()
        +
        page.slice(1);

}


// ================= VIEW ALL =================

document.querySelectorAll(
    "[data-go]"
).forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                showPage(
                    button.dataset.go
                );

            }
        );

    }
);


// ================= MODAL =================

const modal =
    document.getElementById(
        "modal"
    );


document.getElementById(
    "addExpenseBtn"
).addEventListener(
    "click",
    () => {

        modal.classList.add(
            "show"
        );


        document.getElementById(
            "date"
        ).value =
            new Date()
                .toISOString()
                .slice(0, 10);

    }
);


function closeModal() {

    modal.classList.remove(
        "show"
    );

}


document.getElementById(
    "closeModal"
).addEventListener(
    "click",
    closeModal
);


document.getElementById(
    "cancelModal"
).addEventListener(
    "click",
    closeModal
);


// ================= ADD EXPENSE =================

document.getElementById(
    "expenseForm"
).addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const amount =
            Number(
                document.getElementById(
                    "amount"
                ).value
            );


        const category =
            document.getElementById(
                "category"
            ).value;


        const description =
            document.getElementById(
                "description"
            ).value.trim();


        const date =
            document.getElementById(
                "date"
            ).value;


        if (
            !amount ||
            amount <= 0
        ) {

            alert(
                "Please enter a valid amount."
            );

            return;

        }


        const expense = {

            amount: amount,

            category: category,

            description: description,

            date: date

        };


        try {

            const result =
                await addExpenseToBackend(
                    expense
                );


            expense.id =
                result.id;


            expenses.push(
                expense
            );


            this.reset();

            closeModal();

            renderDashboard();

        }
        catch (error) {

            console.error(error);

            alert(
                "Could not add expense.\n\n" +
                "Make sure the C++ backend is running."
            );

        }

    }
);


// ================= SAVE BUDGET =================

document.getElementById(
    "saveBudgetBtn"
).addEventListener(
    "click",
    async () => {

        const value =
            Number(
                document.getElementById(
                    "budgetInput"
                ).value
            );


        if (
            Number.isNaN(value) ||
            value < 0
        ) {

            alert(
                "Please enter a valid budget."
            );

            return;

        }


        try {

            await saveBudgetToBackend(
                value
            );


            budget = value;


            renderDashboard();


            alert(
                "Monthly budget saved!"
            );

        }
        catch (error) {

            console.error(error);

            alert(
                "Could not save budget.\n\n" +
                "Make sure the C++ backend is running."
            );

        }

    }
);


// ================= SEARCH =================

document.getElementById(
    "searchInput"
).addEventListener(
    "input",
    function() {

        renderExpenses(
            this.value
        );

    }
);


// ================= ESCAPE HTML =================

function escapeHTML(text) {

    return String(text)
        .replace(
            /[&<>"']/g,
            character => {

                return {

                    "&": "&amp;",

                    "<": "&lt;",

                    ">": "&gt;",

                    '"': "&quot;",

                    "'": "&#039;"

                }[character];

            }
        );

}


// ================= START APP =================

checkAuth();