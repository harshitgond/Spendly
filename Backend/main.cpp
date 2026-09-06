#include "crow.h"
#include "crow/middlewares/cors.h"

#ifdef DELETE
#undef DELETE
#endif

#include <fstream>
#include <vector>
#include <string>
#include <sstream>
#include <cstdlib>
#include <map>
#include <random>
#include <chrono>
#include <functional>
#include <algorithm>

using namespace std;

// ======================================================
// DATA STRUCTURES
// ======================================================

struct Expense
{
    int id;
    double amount;
    string category;
    string description;
    string date;
};

struct User
{
    int id;
    string username;
    string password;
};

// Logged-in sessions
map<string, int> sessions;


// ======================================================
// PASSWORD HASH
// ======================================================
// Demo-level password hashing for this student project.

string hashPassword(const string& password)
{
    hash<string> hasher;
    size_t hashed = hasher(password);

    stringstream ss;
    ss << hashed;

    return ss.str();
}


// ======================================================
// USER FILE
// ======================================================

const string USERS_FILE = "users.txt";


// ======================================================
// LOAD USERS
// ======================================================

vector<User> loadUsers()
{
    vector<User> users;

    ifstream file(USERS_FILE);

    if (!file)
        return users;

    string line;

    while (getline(file, line))
    {
        if (line.empty())
            continue;

        stringstream ss(line);

        User user;
        string temp;

        getline(ss, temp, '|');
        user.id = stoi(temp);

        getline(ss, user.username, '|');
        getline(ss, user.password, '|');

        users.push_back(user);
    }

    file.close();

    return users;
}


// ======================================================
// SAVE USERS
// ======================================================

void saveUser(const User& user)
{
    ofstream file(USERS_FILE, ios::app);

    file << user.id << "|"
         << user.username << "|"
         << user.password << "\n";

    file.close();
}


// ======================================================
// FIND USER BY ID
// ======================================================

bool getUserById(int id, User& result)
{
    vector<User> users = loadUsers();

    for (const auto& user : users)
    {
        if (user.id == id)
        {
            result = user;
            return true;
        }
    }

    return false;
}


// ======================================================
// FIND USER BY USERNAME
// ======================================================

bool usernameExists(const string& username)
{
    vector<User> users = loadUsers();

    for (const auto& user : users)
    {
        if (user.username == username)
            return true;
    }

    return false;
}


// ======================================================
// GENERATE USER ID
// ======================================================

int generateUserId()
{
    vector<User> users = loadUsers();

    int maxId = 0;

    for (const auto& user : users)
    {
        maxId = max(maxId, user.id);
    }

    return maxId + 1;
}


// ======================================================
// FILE NAMES FOR EACH USER
// ======================================================

string expenseFile(int userId)
{
    return "user_" + to_string(userId) + "_expenses.txt";
}

string budgetFile(int userId)
{
    return "user_" + to_string(userId) + "_budget.txt";
}


// ======================================================
// LOAD USER EXPENSES
// ======================================================

vector<Expense> loadExpenses(int userId)
{
    vector<Expense> expenses;

    ifstream file(expenseFile(userId));

    if (!file)
        return expenses;

    string line;

    while (getline(file, line))
    {
        if (line.empty())
            continue;

        stringstream ss(line);

        Expense e;
        string temp;

        getline(ss, temp, '|');
        e.id = stoi(temp);

        getline(ss, temp, '|');
        e.amount = stod(temp);

        getline(ss, e.category, '|');
        getline(ss, e.description, '|');
        getline(ss, e.date, '|');

        expenses.push_back(e);
    }

    file.close();

    return expenses;
}


// ======================================================
// SAVE USER EXPENSES
// ======================================================

void saveExpenses(int userId, const vector<Expense>& expenses)
{
    ofstream file(expenseFile(userId));

    for (const auto& e : expenses)
    {
        file << e.id << "|"
             << e.amount << "|"
             << e.category << "|"
             << e.description << "|"
             << e.date << "\n";
    }

    file.close();
}


// ======================================================
// LOAD USER BUDGET
// ======================================================

double loadBudget(int userId)
{
    double budget = 0;

    ifstream file(budgetFile(userId));

    if (file)
        file >> budget;

    file.close();

    return budget;
}


// ======================================================
// SAVE USER BUDGET
// ======================================================

void saveBudget(int userId, double budget)
{
    ofstream file(budgetFile(userId));

    file << budget;

    file.close();
}


// ======================================================
// GENERATE LOGIN TOKEN
// ======================================================

string generateToken()
{
    static random_device rd;
    static mt19937 generator(rd());

    uniform_int_distribution<unsigned long long> distribution;

    unsigned long long part1 = distribution(generator);
    unsigned long long part2 = distribution(generator);

    return to_string(part1) + to_string(part2);
}


// ======================================================
// GET LOGGED-IN USER
// ======================================================

int getLoggedInUser(const crow::request& req)
{
    string auth = req.get_header_value("Authorization");

    if (auth.size() < 8)
        return -1;

    if (auth.substr(0, 7) != "Bearer ")
        return -1;

    string token = auth.substr(7);

    auto it = sessions.find(token);

    if (it == sessions.end())
        return -1;

    return it->second;
}


// ======================================================
// MAIN
// ======================================================

int main()
{
    crow::App<crow::CORSHandler> app;

    // ==================================================
    // CORS
    // ==================================================

    app.get_middleware<crow::CORSHandler>()
        .global()
        .origin("*")
        .headers("Content-Type", "Authorization")
        .methods("OPTIONS"_method, "GET"_method, "POST"_method, "DELETE"_method);


    // ==================================================
    // HOME
    // ==================================================

    CROW_ROUTE(app, "/")
    ([]()
    {
        return crow::response(
            "Student Expense Tracker C++ Backend is Running!"
        );
    });


    // ==================================================
    // REGISTER
    // POST /register
    // ==================================================

    CROW_ROUTE(app, "/register")
    .methods(crow::HTTPMethod::POST)
    ([](const crow::request& req)
    {
        auto body = crow::json::load(req.body);

        if (!body ||
            !body.has("username") ||
            !body.has("password"))
        {
            return crow::response(
                400,
                "Username and password are required"
            );
        }

        string username = body["username"].s();
        string password = body["password"].s();

        if (username.empty() || password.empty())
        {
            return crow::response(
                400,
                "Username and password cannot be empty"
            );
        }

        if (usernameExists(username))
        {
            return crow::response(
                409,
                "Username already exists"
            );
        }

        User user;

        user.id = generateUserId();
        user.username = username;
        user.password = hashPassword(password);

        saveUser(user);

        crow::json::wvalue result;

        result["message"] = "Registration successful";
        result["user_id"] = user.id;
        result["username"] = user.username;

        return crow::response(result);
    });


    // ==================================================
    // LOGIN
    // POST /login
    // ==================================================

    CROW_ROUTE(app, "/login")
    .methods(crow::HTTPMethod::POST)
    ([](const crow::request& req)
    {
        auto body = crow::json::load(req.body);

        if (!body ||
            !body.has("username") ||
            !body.has("password"))
        {
            return crow::response(
                400,
                "Username and password are required"
            );
        }

        string username = body["username"].s();
        string password = body["password"].s();

        string hashedPassword = hashPassword(password);

        vector<User> users = loadUsers();

        for (const auto& user : users)
        {
            if (user.username == username &&
                user.password == hashedPassword)
            {
                string token = generateToken();

                sessions[token] = user.id;

                crow::json::wvalue result;

                result["message"] = "Login successful";
                result["token"] = token;
                result["user_id"] = user.id;
                result["username"] = user.username;

                return crow::response(result);
            }
        }

        return crow::response(
            401,
            "Invalid username or password"
        );
    });


    // ==================================================
    // LOGOUT
    // POST /logout
    // ==================================================

    CROW_ROUTE(app, "/logout")
    .methods(crow::HTTPMethod::POST)
    ([](const crow::request& req)
    {
        string auth = req.get_header_value("Authorization");

        if (auth.size() >= 8 &&
            auth.substr(0, 7) == "Bearer ")
        {
            string token = auth.substr(7);

            sessions.erase(token);
        }

        crow::json::wvalue result;

        result["message"] = "Logged out successfully";

        return crow::response(result);
    });


    // ==================================================
    // CURRENT USER
    // GET /me
    // ==================================================

    CROW_ROUTE(app, "/me")
    .methods(crow::HTTPMethod::GET)
    ([](const crow::request& req)
    {
        int userId = getLoggedInUser(req);

        if (userId == -1)
        {
            return crow::response(
                401,
                "Unauthorized"
            );
        }

        User user;

        if (!getUserById(userId, user))
        {
            return crow::response(
                404,
                "User not found"
            );
        }

        crow::json::wvalue result;

        result["user_id"] = user.id;
        result["username"] = user.username;

        return crow::response(result);
    });


    // ==================================================
    // GET ALL EXPENSES
    // GET /expenses
    // ==================================================

    CROW_ROUTE(app, "/expenses")
    .methods(crow::HTTPMethod::GET)
    ([](const crow::request& req)
    {
        int userId = getLoggedInUser(req);

        if (userId == -1)
        {
            return crow::response(
                401,
                "Unauthorized"
            );
        }

        vector<Expense> expenses =
            loadExpenses(userId);

        crow::json::wvalue::list items;

        for (const auto& e : expenses)
        {
            crow::json::wvalue item;

            item["id"] = e.id;
            item["amount"] = e.amount;
            item["category"] = e.category;
            item["description"] = e.description;
            item["date"] = e.date;

            items.push_back(std::move(item));
        }

        return crow::response(
            crow::json::wvalue(items)
        );
    });


    // ==================================================
    // ADD EXPENSE
    // POST /expenses
    // ==================================================

    CROW_ROUTE(app, "/expenses")
    .methods(crow::HTTPMethod::POST)
    ([](const crow::request& req)
    {
        int userId = getLoggedInUser(req);

        if (userId == -1)
        {
            return crow::response(
                401,
                "Unauthorized"
            );
        }

        auto body = crow::json::load(req.body);

        if (!body)
        {
            return crow::response(
                400,
                "Invalid JSON"
            );
        }

        vector<Expense> expenses =
            loadExpenses(userId);

        Expense e;

        if (expenses.empty())
            e.id = 1;
        else
            e.id = expenses.back().id + 1;

        e.amount = body["amount"].d();
        e.category = body["category"].s();
        e.description = body["description"].s();
        e.date = body["date"].s();

        expenses.push_back(e);

        saveExpenses(userId, expenses);

        crow::json::wvalue result;

        result["message"] =
            "Expense added successfully";

        result["id"] = e.id;

        return crow::response(result);
    });


    // ==================================================
    // DELETE EXPENSE
    // DELETE /expenses/<id>
    // ==================================================

    CROW_ROUTE(app, "/expenses/<int>")
    .methods(crow::HTTPMethod::DELETE)
    ([](const crow::request& req, int id)
    {
        int userId = getLoggedInUser(req);

        if (userId == -1)
        {
            return crow::response(
                401,
                "Unauthorized"
            );
        }

        vector<Expense> expenses =
            loadExpenses(userId);

        for (auto it = expenses.begin();
             it != expenses.end();
             ++it)
        {
            if (it->id == id)
            {
                expenses.erase(it);

                saveExpenses(userId, expenses);

                return crow::response(
                    "Expense deleted successfully"
                );
            }
        }

        return crow::response(
            404,
            "Expense not found"
        );
    });


    // ==================================================
    // SUMMARY
    // GET /summary
    // ==================================================

    CROW_ROUTE(app, "/summary")
    .methods(crow::HTTPMethod::GET)
    ([](const crow::request& req)
    {
        int userId = getLoggedInUser(req);

        if (userId == -1)
        {
            return crow::response(
                401,
                "Unauthorized"
            );
        }

        vector<Expense> expenses =
            loadExpenses(userId);

        double budget =
            loadBudget(userId);

        double total = 0;

        for (const auto& e : expenses)
        {
            total += e.amount;
        }

        double remaining =
            budget - total;

        crow::json::wvalue result;

        result["total"] = total;
        result["budget"] = budget;
        result["remaining"] = remaining;
        result["transactions"] =
            static_cast<int>(expenses.size());

        return crow::response(result);
    });


    // ==================================================
    // GET BUDGET
    // GET /budget
    // ==================================================

    CROW_ROUTE(app, "/budget")
    .methods(crow::HTTPMethod::GET)
    ([](const crow::request& req)
    {
        int userId = getLoggedInUser(req);

        if (userId == -1)
        {
            return crow::response(
                401,
                "Unauthorized"
            );
        }

        double budget =
            loadBudget(userId);

        crow::json::wvalue result;

        result["budget"] = budget;

        return crow::response(result);
    });


    // ==================================================
    // SET BUDGET
    // POST /budget
    // ==================================================

    CROW_ROUTE(app, "/budget")
    .methods(crow::HTTPMethod::POST)
    ([](const crow::request& req)
    {
        int userId = getLoggedInUser(req);

        if (userId == -1)
        {
            return crow::response(
                401,
                "Unauthorized"
            );
        }

        auto body = crow::json::load(req.body);

        if (!body)
        {
            return crow::response(
                400,
                "Invalid JSON"
            );
        }

        double budget =
            body["budget"].d();

        saveBudget(userId, budget);

        crow::json::wvalue result;

        result["message"] =
            "Budget saved successfully";

        result["budget"] = budget;

        return crow::response(result);
    });


    // ==================================================
    // START SERVER
    // ==================================================

    cout << "====================================\n";
    cout << "   STUDENT EXPENSE TRACKER API\n";
    cout << "====================================\n";

    const char* portEnv =
        std::getenv("PORT");

    int port =
        portEnv
        ? std::stoi(portEnv)
        : 18080;

    cout << "Server running on port "
         << port << "...\n";

    app.bindaddr("0.0.0.0")
       .port(port)
       .multithreaded()
       .run();

    return 0;
}