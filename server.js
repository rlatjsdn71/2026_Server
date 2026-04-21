const express = require('express') // express 라이브러리 불러오기
const app = express()

// public 폴더 경로 지정
app.use(express.static(__dirname + '/public'));
// 경로를 지정해야 css파일, 이미지 파일같은 보조 파일(static파일) 불러올 수 있음

// 8080은 포트번호
app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
})

// 메인페이지 접속 시(get 요청 시) 콜백 함수 실행(/ = 메인페이지)
app.get('/', (요청, 응답) => {
    // 파일 전송 
    응답.sendFile(__dirname + '/index.html'); // __dirname: 현재 디렉토리의 절대 경로
})

// 라우팅 (/news 페이지)
app.get('/news', (요청, 응답) => {
    응답.send('뉴스다옹~')
})

app.get('/shop', (요청, 응답) => {
    응답.send('가게다옹~')
})

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + '/about.html');
})