// express 라이브러리 세팅
const express = require('express')
const app = express()

// dotenv 세팅 (환경변수 파일 사용)
require('dotenv').config();

// public 폴더 경로 지정
app.use(express.static(__dirname + '/public'));
// 경로를 지정해야 css파일, 이미지 파일같은 보조 파일(static파일) 불러올 수 있음

// ejs 세팅
app.set('view engine', 'ejs');
// ejs 파일 쓰면 페이지에 서버데이터를 쉽게 집어넣을 수 있음

// req.body 사용을 위한 세팅
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// method-override 세팅 (PUT, DELETE 메소드 사용가능)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// mongodb 설정 (database.js 참고)
const { ObjectId } = require("mongodb"); // ObjectID
const connectDB = require('./database.js'); // database.js에서 내용 불러오기
let db;
connectDB.then((client) => { // mongdodb와 연결
    console.log('DB연결성공')
    db = client.db('forum') // forum 데이터 베이스와 연결
    // 포트번호를 환경변수로 저장하여 사용 ( .env 파일 참고)
    app.listen(process.env.PORT, () => {
        console.log('http://localhost:8080 에서 서버 실행중')
    })
}).catch((err) => {
    console.log(err)
});

// 메인페이지 접속 시(get 요청 시) 콜백 함수 실행(/ = 메인페이지)
app.get('/', (요청, 응답) => {
    // 파일 전송 
    응답.sendFile(__dirname + '/index.html'); // __dirname: 현재 디렉토리의 절대 경로
})

// 로그인 시퀀스 불러오기
app.use('/', require('./routes/login.js'));

// 게시물 관련 기능 불러오기
app.use('/', require('./routes/post.js'));


// ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ 테스트 연습 메모 ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ //

// 라우팅 (/news 페이지)
app.get('/news', (요청, 응답) => {
    // db에 데이터 입력
    db.collection('post').insertOne({ title: '메롱메롱 인서트' }); // post 컬렉션에 내용 입력
    // 컬렉션은 대충 폴더라고 생각
    // 응답.send('뉴스다옹~')
})

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + '/about.html');
})

app.post('/about/login', (req, res) => {
    res.send("로그인~");
})

app.get('/time', (요청, 응답) => {
    응답.render('time.ejs', { time: new Date() });
})

app.put('/updatetest', async (req, res) => {
    try {
        await db.collection('post').updateOne(
            { _id: 1 },
            // $set: 해당 필드에 값을 덮어씌움
            // $inc: 해당 필드에 값을 더해줌
            // $mul: 해당 필드에 값을 곱해줌
            // $unset: 해당 필드 삭제
            { $inc: { like: 1 } });
        // updateMany 조건에 맞는 모든 도큐먼트 갱신
        await db.collection('post').updateMany(
            // 조건으로 여러 도큐먼트 필터링 가능
            // $ne: 다름, $gt: 초과, $gte: 이상, $lt: 미만, $lte: 이하
            { like: { $gt: 10 } },
            { $inc: { like: 1 } });
        let result = await db.collection('post').findOne({ _id: 1 });

        // 예외 처리
        if (result == null)
            res.status(404).send("존재하지 않는 URL 입니다.");
        else
            res.render('test.ejs', { result: result });
    }
    catch {
        res.render('test');
    }
})

app.get('/querystring', async (req, res) => {
    console.log(req.query);
})

app.get('/mypage', async (req, res) => {
    if (!req.user) res.redirect('/login');
    else res.render('mypage.ejs', { user: req.user });
})

// 미들웨어에 대하여...
function middleTest(req, res, next) {
    // 파라미터를 req, res, next로 설정하여
    if (!req.user) res.redirect('/login'); // res.redirect, send, render,
    req.body.password; // req.body, params, user 등등 사용 가능
    req.params.password;
    next(); // 미들웨어 끝나면 next 함수 호출하여 미들웨어 종료
}
// 요청 함수 아규먼트로 미들웨어 함수를 전달
// 해당 요청이 들어오면 미들웨어 먼저 실행 후 본문 실행됨
// 배열 형태로 여러개의 미들웨어 전달 가능
app.get('/middletest', middleTest, (req, res) => {
    res.send('middle test');
})
// app.use(middleTest) // 이하의 API에 대하여 미들웨어 실행시킴
// app.use('/URL', middleTest) // 이하의 '/URL' 및 '/URL/...'에 대하여 미들웨어 실행시킴

// 다른 파일의 내용(api) 불러 사용하기 (미들웨어 식으로 등록)
app.use('/shop', require('./routes/shop.js'));