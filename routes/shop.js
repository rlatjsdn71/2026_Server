// 다른 파일로 내용(api) 내보내기

// 설정 필요
const router = require('express').Router();

// 기존의 app 대신 router에 대해 요청 작성
router.get('/shirts', (req,res)=>{
    res.send('셔츠');
});

router.get('/pants', (req,res)=>{
    res.send('바지');
});

// DB 내용 사용하기
const connectDB = require('./../database.js');
let db;
connectDB.then((client)=>{
    db = client.db('forum');
}).catch((err)=>{
    console.log(err);
});

// 내보내기
module.exports = router;