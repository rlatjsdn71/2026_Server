const router = require('express').Router();

// bycrypt 세팅 (해싱 기능)
const bcrypt = require('bcrypt');
const comflex = 10; // 복잡도 설정

// connect-mongo 세팅 (세션 DB 저장 기능)
const MongoStore = require('connect-mongo').default; // 앞으로 require 했는데 잘 안되면 default 붙이기

// passport 라이브러리 세팅 (로그인 기능)
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
router.use(passport.initialize())
router.use(session({
    secret: 'abcde12345', // 암호화 비밀번호
    resave: false, // true: 요청할 때마다 세션 리셋
    saveUninitialized: false, // true:  로그인 안해도 세션 생성
    cookie: { maxAge: 60 * 60 * 1000 }, // cookie.maxAge: 세션 유지 시간 ms 단위(기본값은 2주)
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL,
        dbName: 'forum'
    })
}))
router.use(passport.session())

// DB 내용 사용하기
const {ObjectId} = require("mongodb");
const connectDB = require('./../database.js');
let db;
connectDB.then((client)=>{
    db = client.db('forum');
}).catch((err)=>{
    console.log(err);
});

// 로그인 시퀀스
// 아이디 비밀번호 검사 코드
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    // id 검색
    let result = await db.collection('user').findOne({ username: 입력한아이디 })
    // id 없으면...
    if (!result) {
        // 실패 리턴
        return cb(null, false, { message: '아이디 DB에 없음' })
    }
    // 비밀먼호가 같으면 (bcrypt.compare 함수로 평문과 해싱된 값을 비교 가능)
    if (await bcrypt.compare(입력한비번, result.password)) {
        // 결과(유저정보) 리턴
        return cb(null, result)
    }
    // 비밀번호가 다르면
    else {
        // 실패 리턴
        return cb(null, false, { message: '비번불일치' });
    }
}))
// 위 코드를 실행시키려면 passport.authenticate('local')() 함수 사용

// 세션 발행 코드
passport.serializeUser((user, done) => {
    // user 파라미터: 유저의 DB에 담긴 정보 (authenticate 함수의 result가 전달됨)
    process.nextTick(() => {
        // 세션 도큐먼트에 발행할 내용 작성
        // 아래 예시에서는 user._id와 user.username이 세션 도큐먼트에 포함됨
        done(null, { id: user._id, username: user.username })
    })
})
// 위 코드는 req.logIn() 함수 실행 시 자동 실행됨

// 쿠키(세션 도큐먼트 포함) 분석 코드
passport.deserializeUser(async (user, done) => {
    // 세션 도큐먼트의 user를 DB에 조회하여 유저 정보 최신화
    let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) })
    // password 포함되면 안되니까 password 제거
    delete result.password
    process.nextTick(() => {
        // 쿠키를 확인하고 이상이 없으면
        return done(null, result) // 유저 정보 리턴
    })
})
// 이 코드 아래 작성된 API에서 req.user 사용하면 로그인된 유저의 정보가 반환됨

// 로그인 페이지
router.get('/login', async (req, res) => {
    if (!req.user) res.render('login.ejs');
    else res.redirect('/');
})

// 로그인 요청
router.post('/login', async (req, res, next) => {
    // 아이디 비밀먼호 확인
    passport.authenticate('local', (error, user, info) => { // 확인 이후 실행시킬 내용 콜백함수로 작성
        if (error) return res.status(500).json(error); // 에러처리
        if (!user) return res.status(5401).json(info.message); // 로그인 실패(아이디 비밀번호 불일치) 처리
        req.logIn(user, (err) => { // 로그인 성공 처리
            if (err) return next(err); // 로그인 성공해도 에러 발생 할 수 있으므로 에러 처리
            res.redirect('/');
        })
    })(req, res, next) // 아규먼트로는 req, res, next 필요
})

// 가입 페이지
router.get('/register', async (req, res) => {
    res.render('register.ejs');
})

// 가입 요청
router.post('/register', async (req, res) => {
    // id 중복 확인
    let id = await db.collection('user').findOne({ username: req.body.username });
    // 비밀번화 2중 확인
    let pw_verif = req.body.password === req.body.password_verification;
    if (!id && pw_verif) {
        let pass = await bcrypt.hash(req.body.password, comflex); // 비밀번호 해싱(뒤 숫자는 복잡도 일반적으로 10)
        await db.collection('user').insertOne({
            username: req.body.username,
            password: pass
        });
        res.redirect('/login')
    }
    else {
        res.redirect('/register');
    }
})

// 로그아웃
router.post('/logout', (req, res) => {
    // 서버에서 세션 삭제
    if (!req.user) res.redirect('/login');
    else {
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
                return res.status(500).send('로그아웃 중 오류가 발생했습니다.');
            }
            // 브라우저의 세션 쿠키 삭제 (기본 이름은 'connect.sid')
            res.clearCookie('connect.sid');
            // 로그아웃 후 메인 페이지 등으로 이동
            res.redirect('/');
        });
    }
});

module.exports = router