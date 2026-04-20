const express = require('express') // express 라이브러리
const app = express()

// 8080은 포트번호
app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
})

// 메인페이지 접속 시 실행(/ = 메인페이지)
app.get('/', (요청, 응답) => { 
    응답.send('반갑다 할루할루')
})