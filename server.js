
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const app = express();

app.use(express.json());

// Read HTML, CSS and other files from public folder
app.use(express.static("public"));

// DATABASE CONNECTION
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Zuneraamber@111007",
    database: "zunera_dms"
});

// Check database connection
db.getConnection()
    .then(connection => {
        console.log("Connected to MySQL Database");
        connection.release();
    })
    .catch(err => {
        console.log("Database connection failed:", err.message);
    });


// GENERIC CRUD FUNCTION
function createCRUD(route, table, id, fields, selectQuery = null, transform = null) {

    const select = selectQuery || `SELECT * FROM ${table}`;

    // GET ALL RECORDS
    app.get(route, async (req, res) => {
        try {
            const [result] = await db.query(select);
            res.json(result);
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    });

    // GET ONE RECORD
    app.get(route + "/:" + id, async (req, res) => {
        try {
            const [result] = await db.query(
                `SELECT * FROM ${table} WHERE ${id} = ?`,
                [req.params[id]]
            );

            res.json(result);
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    });

    // INSERT RECORD
    app.post(route, async (req, res) => {
        try {
            let data = {};

            fields.forEach(field => {
                if (req.body[field] !== undefined) {
                    data[field] = req.body[field];
                }
            });

            if (transform) {
                data = await transform(data);
            }

            const columns = Object.keys(data);

            if (columns.length === 0) {
                return res.status(400).send("No data provided");
            }

            const values = columns.map(field => data[field]);
            const placeholders = columns.map(() => "?").join(",");

            const sql = `INSERT INTO ${table}
                         (${columns.join(",")})
                         VALUES (${placeholders})`;

            await db.query(sql, values);

            res.send("Record Inserted Successfully");
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    });

    // UPDATE RECORD
    app.put(route + "/:" + id, async (req, res) => {
        try {
            let data = {};

            fields.forEach(field => {
                if (req.body[field] !== undefined) {
                    data[field] = req.body[field];
                }
            });

            if (transform) {
                data = await transform(data);
            }

            const columns = Object.keys(data);

            if (columns.length === 0) {
                return res.status(400).send("No data provided to update");
            }

            const values = columns.map(field => data[field]);

            const setValues = columns
                .map(field => `${field} = ?`)
                .join(",");

            values.push(req.params[id]);

            const sql = `UPDATE ${table}
                         SET ${setValues}
                         WHERE ${id} = ?`;

            const [result] = await db.query(sql, values);

            if (result.affectedRows === 0) {
                res.status(404).send("Record NOT found");
            }
            else {
                res.send("Record Updated Successfully");
            }
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    });

    // DELETE RECORD
    app.delete(route + "/:" + id, async (req, res) => {
        try {
            const [result] = await db.query(
                `DELETE FROM ${table} WHERE ${id} = ?`,
                [req.params[id]]
            );

            if (result.affectedRows === 0) {
                res.status(404).send("Record NOT found to delete");
            }
            else {
                res.send("Record Deleted Successfully");
            }
        }
        catch (err) {
            res.status(500).send(err.message);
        }
    });
}


// --------------------------------------------------
// 1. USERS TABLE
// --------------------------------------------------

createCRUD(
    "/users",
    "users",
    "user_id",
    ["name", "email", "password", "role"],

    // Do not display passwords in GET ALL
    "SELECT user_id, name, email, role FROM users",

    // Hash password before inserting or updating
    async (data) => {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        return data;
    }
);


// --------------------------------------------------
// 2. CATEGORIES TABLE
// --------------------------------------------------

createCRUD(
    "/categories",
    "categories",
    "category_id",
    ["category_name", "description"]
);


// --------------------------------------------------
// 3. DOCUMENTS TABLE
// --------------------------------------------------

createCRUD(
    "/documents",
    "documents",
    "document_id",
    [
        "user_id",
        "category_id",
        "title",
        "file_name",
        "file_path",
        "upload_date",
        "status"
    ]
);


// --------------------------------------------------
// 4. DOCUMENT_ACCESS TABLE
// --------------------------------------------------

createCRUD(
    "/document_access",
    "document_access",
    "access_id",
    [
        "document_id",
        "user_id",
        "permission",
        "granted_date"
    ]
);


// START SERVER
app.listen(3000, () => {
    console.log("Zunera's Digital Document Management System");
    console.log("Server running at http://localhost:3000");
});
