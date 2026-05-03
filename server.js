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

// DB접속 url: username, password 입력
const url = process.env.DB_URL;
let db;


// req.body 사용을 위한 세팅
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// method-override 세팅 (PUT, DELETE 메소드 사용가능)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// bycrypt 세팅 (해싱 기능)
const bcrypt = require('bcrypt');
const comflex = 10; // 복잡도 설정

// connect-mongo 세팅 (세션 DB 저장 기능)
const MongoStore = require('connect-mongo').default; // 앞으로 require 했는데 잘 안되면 default 붙이기

// passport 라이브러리 세팅 (로그인 기능)
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
app.use(passport.initialize())
app.use(session({
    secret: 'abcde12345', // 암호화 비밀번호
    resave: false, // true: 요청할 때마다 세션 리셋
    saveUninitialized: false, // true:  로그인 안해도 세션 생성
    cookie: { maxAge: 60 * 60 * 1000 }, // cookie.maxAge: 세션 유지 시간 ms 단위(기본값은 2주)
    store: MongoStore.create({
        mongoUrl: url,
        dbName: 'forum'
    })
}))
app.use(passport.session())

// mongodb 라이브러리 설정
const { MongoClient, ObjectId } = require('mongodb') // mongodb 라이브러리 불러오기
new MongoClient(url).connect().then((client) => { // mongdodb와 연결
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

// 라우팅 (/news 페이지)
app.get('/news', (요청, 응답) => {
    // db에 데이터 입력
    db.collection('post').insertOne({ title: '메롱메롱 인서트' }); // post 컬렉션에 내용 입력
    // 컬렉션은 대충 폴더라고 생각
    // 응답.send('뉴스다옹~')
})

app.get('/shop', (요청, 응답) => {
    응답.send('가게다옹~')
})

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + '/about.html');
})

app.post('/about/login', (req, res) => {
    res.send("로그인~");
})

app.get('/list/:pageNum', async (req, res) => {
    let page_num = req.params.pageNum;

    // await = 비동기 실행을 동기 처리
    // let result = await db.collection('post').find().skip((page_num - 1) * 5).limit(5).toArray();
    // find = post 컬렉션에 있는 모든 내용 불러오기
    // skip(n) = 앞에서 n개 건너뜀
    // limit(n) = 최대 n개만 불러오기
    let result = await db.collection('post').find().toArray();

    //console.log(res[0].title); // 서버에서 console.log 하면 터미널에 출력됨

    // ejs 파일은 sendFile이 아닌 render 명령어 사용
    // 기본 경로 설정이 views 폴더롤 되었기 때문에 경로 없이 이름만 입력
    // 뒤에 아규먼트 추가해서 데이터 보내줄 수 있음 -> 관습적으로 오브젝트 형태로 보낸다
    res.render('list.ejs', { posts: result, page: page_num });
})

app.get('/time', (요청, 응답) => {
    응답.render('time.ejs', { time: new Date() });
})

app.get('/write', (req, res) => {
    res.render('write.ejs', {});
})

app.post('/newposting', async (req, res) => {
    // req.body 사용해서 form 태그의 input 내용들 불러오기 (오브젝트 형태 {input_name: 내용, ...})
    // db에 데이터 저장(삽입)하는 법 (데이터는 오브젝트 형태로 저장)
    if (req.body.title.length == 0) res.redirect('/write');
    else {
        await db.collection('post').insertOne({ title: req.body.title, content: req.body.content });
        // 리다이렉트
        res.redirect('/write');
    }
})

// url parameter 사용법~ (/:작명, 여러개 사용 가능)
app.get('/detail/:postID', async (req, res) => {
    // req.params: url 파라미터에 입력된 값을 오브젝트로 반환
    // console.log(req.params); // {postID: '입력된 값'}

    // db에서 데이터 검색해서 찾는 법! (데이터(오브젝트)를 이용해서 검색)
    try {
        // db 상에 맞는 데이터 타입 사용
        let result = await db.collection('post').findOne({ _id: new ObjectId(req.params.postID) });
        if (result == null)
            res.status(404).send("존재하지 않는 URL 입니다.");
        else
            res.render('detail.ejs', { post: result });
    }
    catch (e) {
        console.log(e);
        res.status(404).send("존재하지 않는 URL 입니다.")
    }
})

app.get('/update/:postID', async (req, res) => {
    try {
        let result = await db.collection('post').findOne({ _id: new ObjectId(req.params.postID) });
        if (result == null)
            res.status(404).send("존재하지 않는 URL 입니다.");
        else
            res.render('update.ejs', { post: result });
    }
    catch (e) {
        console.log(e);
        res.status(404).send("존재하지 않는 URL 입니다.")
    }
})

// update.ejs의 form 태그에서 메소드를 PUT으로 설정
app.put('/updating/:postID', async (req, res) => {
    if (req.body.title.length == 0) res.redirect('/list');
    else {
        // db에서 값 수정하는 기능
        await db.collection('post').updateOne(
            // {filter}: 찾을 값
            { _id: new ObjectId(req.params.postID) },
            // {$set:{data}}: 수정할 값 ($set 사용 안하면 해당 값이 수정되는 것이 아니라 전체가 덮어씌워짐)
            { $set: { title: req.body.title, content: req.body.content } });
        res.redirect('/detail/' + req.params.postID);
    }
})

app.delete('/deleting', async (req, res) => {
    // query string 문법 사용
    await db.collection('post').deleteOne({ _id: new ObjectId(req.query.postID) });
    // deleteOne, deleteMany: updateOne, updateMany 문법과 동일

    // 삭제 후 리스트 페이지로 리다이렉트 하기 (ajax 통신 후 res.redirect, res.render 안됨)
    res.json({ redirectURL: '/list' }); // 클라이언트에게 리다이렉트할 경로 전달
})

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
app.get('/login', async (req, res) => {
    if (!req.user) res.render('login.ejs');
    else res.redirect('/');
})

// 로그인 요청
app.post('/login', async (req, res, next) => {
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
app.get('/register', async (req, res) => {
    res.render('register.ejs');
})

// 가입 요청
app.post('/register', async (req, res) => {
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
app.post('/logout', (req, res) => {
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

// ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ 테스트 테스트 테스트 ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
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
app.get('/middletest', middleTest, (req,res)=>{
    res.send('middle test');
})
// app.use(middleTest) // 이하의 API에 대하여 미들웨어 실행시킴
// app.use('/URL', middleTest) // 이하의 '/URL' 및 '/URL/...'에 대하여 미들웨어 실행시킴