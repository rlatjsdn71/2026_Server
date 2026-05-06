const router = require('express').Router();

// DB 내용 사용하기
const { ObjectId } = require("mongodb");
const connectDB = require('./../database.js');
let db;
connectDB.then((client) => {
    db = client.db('forum')
}).catch((err) => {
    console.log(err)
});

// 채팅 리스트
router.get('/list/:pageNum', async (req, res) => {
    // 로그인 확인
    if (!req.user) res.redirect('/login');
    else {
        // 채팅방 검색
        let result = await db.collection('chatroom').find({ participants: req.user.username }).toArray();
        // 출력
        res.render('chatList.ejs', { list: result, page: req.params.pageNum, user: req.user.username });
    }

})

// 채팅 요청 (신규 채팅 생성 및 채팅방 리다이렉트)
router.get('/request', async (req, res) => {
    // 로그인 확인
    if (!req.user) res.redirect('/login');
    else {
        // 채팅방 검색
        let result = await db.collection('chatroom').findOne({
            // mongodb에서 키를 포함하는 배열 검색하기
            participants: {
                $all: [req.user.username, req.query.participant]
            }
        });
        // 결과 없으면
        if (!result)
            // 채팅방 생성
            result = await db.collection('chatroom').insertOne({
                participants: [req.user.username, req.query.participant]
            });

        // 채팅방 리다이렉트
        res.redirect(`/chat/detail?chatID=${result._id ? result._id : result.insertedId}`);
    }
});

// 채팅방 상세
router.get('/detail', async (req, res) => {
    // 로그인 확인
    if (!req.user) res.redirect('/login');
    else {
        // 사용자 확인
        let verif = await db.collection('chatroom').findOne({
            _id: new ObjectId(req.query.chatID),
            participants: req.user.username
        });
        if (!verif) res.redirect('/');
        else {
            // 채팅 기록 검색
            let result = await db.collection('chatting').find({ chatID: new ObjectId(req.query.chatID) }).toArray();
            
            // 채팅 기록 시간 순으로 정렬
            result.sort((a,b)=>{
                return a.date - b.date;
            })
            
            // 채팅 상세 페이지 출력
            res.render('chatDetail.ejs', { room: verif, chatting: result, user: req.user.username });
        }
    }
})

module.exports = router;