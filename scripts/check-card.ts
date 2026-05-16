import mysql from "mysql2/promise"

const conn = await mysql.createConnection({
	host: "127.0.0.1",
	port: 3306,
	user: "root",
	password: "qqqq",
	database: "remindly",
})

const [cards] = await conn.query("SELECT id, front, back, details_markdown, interval_index, scheduled_for FROM cards")
const [reviews] = await conn.query("SELECT id, card_id, rating, interval_index_before, interval_index_after, scheduled_for, reviewed_at FROM card_reviews")
console.log("CARDS:", cards)
console.log("REVIEWS:", reviews)
await conn.end()
