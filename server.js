const express = require('express') // express 라이브러리 불러오기
const app = express()

// public 폴더 경로 지정
app.use(express.static(__dirname + '/public'));
// 경로를 지정해야 css파일, 이미지 파일같은 보조 파일(static파일) 불러올 수 있음

app.set('view engine','ejs'); // ejs 세팅
// ejs 파일 쓰면 페이지에 서버데이터를 쉽게 집어넣을 수 있음

// 이하 mongodb 라이브러리 설정
const { MongoClient } = require('mongodb') // mongodb 라이브러리 불러오기

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
    db.collection('post').insertOne({title:'메롱메롱 인서트'}); // post 컬렉션에 내용 입력
    // 컬렉션은 대충 폴더라고 생각
    // 응답.send('뉴스다옹~')
})

app.get('/shop', (요청, 응답) => {
    응답.send('가게다옹~')
})

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + '/about.html');
})

app.get('/list', async (요청, 응답) => {
    let res = await db.collection('post').find().toArray(); // post 컬렉션에 있는 모든 내용 불러오기
    // await = 비동기 실행을 동기 처리

    console.log(res[0].title); // 서버에서 console.log 하면 터미널에 출력됨

    // ejs 파일은 sendFile이 아닌 render 명령어 사용
    // 기본 경로 설정이 views 폴더롤 되었기 때문에 경로 없이 이름만 입력
    // 뒤에 아규먼트 추가해서 데이터 보내줄 수 있음 -> 관습적으로 오브젝트 형태로 보낸다
    응답.render('list.ejs', {posts: res});
})

app.get('/time', (요청, 응답) => {
    응답.render('time.ejs', {time: new Date()});
})