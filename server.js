// express 라이브러리 세팅
const express = require('express')
const app = express()

// public 폴더 경로 지정
app.use(express.static(__dirname + '/public'));
// 경로를 지정해야 css파일, 이미지 파일같은 보조 파일(static파일) 불러올 수 있음

app.set('view engine', 'ejs'); // ejs 세팅
// ejs 파일 쓰면 페이지에 서버데이터를 쉽게 집어넣을 수 있음


// req.body 사용을 위한 세팅
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// method-override 세팅 (PUT, DELETE 메소드 사용가능)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// 이하 mongodb 라이브러리 설정
const { MongoClient, ObjectId } = require('mongodb') // mongodb 라이브러리 불러오기

let db;
// 여기에 db 접속 url과 username, password 입력
const url = `mongodb://admin:dYvOhN6kQlhvQmzv@ac-smg1vck-shard-00-00.meysf13.mongodb.net:27017,
ac-smg1vck-shard-00-01.meysf13.mongodb.net:27017,ac-smg1vck-shard-00-02.meysf13.mongodb.net:27017
/?ssl=true&replicaSet=atlas-rqe29b-shard-0&authSource=admin&appName=Cluster0`;
new MongoClient(url).connect().then((client) => { // mongdodb와 연결
    console.log('DB연결성공')
    db = client.db('forum') // forum 데이터 베이스와 연결
    // 8080은 포트번호
    app.listen(8080, () => {
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

app.get('/list', async (요청, 응답) => {
    let res = await db.collection('post').find().toArray(); // post 컬렉션에 있는 모든 내용 불러오기
    // await = 비동기 실행을 동기 처리

    //console.log(res[0].title); // 서버에서 console.log 하면 터미널에 출력됨

    // ejs 파일은 sendFile이 아닌 render 명령어 사용
    // 기본 경로 설정이 views 폴더롤 되었기 때문에 경로 없이 이름만 입력
    // 뒤에 아규먼트 추가해서 데이터 보내줄 수 있음 -> 관습적으로 오브젝트 형태로 보낸다
    응답.render('list.ejs', { posts: res });
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
        let result = await db.collection('post').findOne({ _id: new ObjectId(req.params.postID) }); // db 상에 맞는 데이터 타입 사용
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
        let result = await db.collection('post').findOne({ _id: new ObjectId(req.params.postID) }); // db 상에 맞는 데이터 타입 사용
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
    await db.collection('post').deleteOne({_id:new ObjectId(req.query.postID)});
    // deleteOne, deleteMany: updateOne, updateMany 문법과 동일

    // 삭제 후 리스트 페이지로 리다이렉트 하기 (ajax 통신 후 res.redirect, res.render 안됨)
    res.json({ redirectURL: '/list' }); // 클라이언트에게 리다이렉트할 경로 전달
})


// test 라우팅
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