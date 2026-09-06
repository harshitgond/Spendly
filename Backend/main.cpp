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

using namespace std;

// ======================================================
// DATA STRUCTURE
// ======================================================

struct Expense
{
    int id;
    double amount;
    string category;
    string description;
    string date;
};

vector<Expense> expenses;
double monthlyBudget = 0;


// ======================================================
// SAVE EXPENSES
// ======================================================

void saveExpenses()
{
    ofstream file("expenses.txt");

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
// LOAD EXPENSES
// ======================================================

void loadExpenses()
{
    ifstream file("expenses.txt");

    if (!file)
        return;

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
}


// ======================================================
// SAVE BUDGET
// ======================================================

void saveBudget()
{
    ofstream file("budget.txt");

    file << monthlyBudget;

    file.close();
}


// ======================================================
// LOAD BUDGET
// ======================================================

void loadBudget()
{
    ifstream file("budget.txt");

    if (file)
        file >> monthlyBudget;

    file.close();
}


// ======================================================
// MAIN
// ======================================================

int main()
{
    // Load saved data
    loadExpenses();
    loadBudget();

    // CORS enabled globally
    crow::App<crow::CORSHandler> app;

    app.get_middleware<crow::CORSHandler>()
        .global()
        .origin("*");


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
    // GET ALL EXPENSES
    // GET /expenses
    // ==================================================

    CROW_ROUTE(app, "/expenses")
    .methods(crow::HTTPMethod::GET)
    ([]()
    {
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

        return crow::response(crow::json::wvalue(items));
    });


    // ==================================================
    // ADD EXPENSE
    // POST /expenses
    // ==================================================

    CROW_ROUTE(app, "/expenses")
    .methods(crow::HTTPMethod::POST)
    ([](const crow::request& req)
    {
        auto body = crow::json::load(req.body);

        if (!body)
        {
            return crow::response(
                400,
                "Invalid JSON"
            );
        }

        Expense e;

        // Generate ID
        if (expenses.empty())
            e.id = 1;
        else
            e.id = expenses.back().id + 1;

        // Read data
        e.amount = body["amount"].d();
        e.category = body["category"].s();
        e.description = body["description"].s();
        e.date = body["date"].s();

        // Save in vector
        expenses.push_back(e);

        // Save in file
        saveExpenses();

        // Response
        crow::json::wvalue result;

        result["message"] = "Expense added successfully";
        result["id"] = e.id;

        return crow::response(result);
    });


    // ==================================================
    // DELETE EXPENSE
    // DELETE /expenses/<id>
    // ==================================================

    CROW_ROUTE(app, "/expenses/<int>")
    .methods(crow::HTTPMethod::DELETE)
    ([](int id)
    {
        for (auto it = expenses.begin();
             it != expenses.end();
             ++it)
        {
            if (it->id == id)
            {
                expenses.erase(it);

                saveExpenses();

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
    ([]()
    {
        double total = 0;

        for (const auto& e : expenses)
        {
            total += e.amount;
        }

        double remaining = monthlyBudget - total;

        crow::json::wvalue result;

        result["total"] = total;
        result["budget"] = monthlyBudget;
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
    ([]()
    {
        crow::json::wvalue result;

        result["budget"] = monthlyBudget;

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
        auto body = crow::json::load(req.body);

        if (!body)
        {
            return crow::response(
                400,
                "Invalid JSON"
            );
        }

        monthlyBudget = body["budget"].d();

        saveBudget();

        crow::json::wvalue result;

        result["message"] = "Budget saved successfully";
        result["budget"] = monthlyBudget;

        return crow::response(result);
    });


    // ==================================================
    // START SERVER
    // ==================================================

    cout << "====================================\n";
    cout << "   STUDENT EXPENSE TRACKER API\n";
    cout << "====================================\n";
    cout << "Server running on port 18080...\n";

   const char* portEnv = std::getenv("PORT");
int port = portEnv ? std::stoi(portEnv) : 18080;

app.bindaddr("0.0.0.0")
   .port(port)
   .multithreaded()
   .run();
    return 0;
}