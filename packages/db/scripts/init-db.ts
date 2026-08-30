import mysql from "mysql2/promise"

const conn = await mysql.createConnection({
	host: "127.0.0.1",
	port: 3306,
	user: "root",
	password: "qqqq",
})

await conn.query("CREATE DATABASE IF NOT EXISTS remindly")
const [rows] = await conn.query("SHOW DATABASES LIKE 'remindly'")
console.log("OK:", rows)
await conn.end()
