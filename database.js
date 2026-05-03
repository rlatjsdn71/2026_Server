// mongodb 라이브러리 불러오기
const { MongoClient } = require("mongodb");

// DB접속 url: username, password 입력
let connectDB = new MongoClient(process.env.DB_URL).connect();

module.exports = connectDB;