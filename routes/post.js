const router = require('express').Router();

// multer 관련 세팅 (이미지 업로드 기능 AWS)
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
    region: 'ap-northeast-2', // aws 서버 위치
    credentials: {
        accessKeyId: process.env.AccKey, // AWS accesskey
        secretAccessKey: process.env.SecKey // AWS secretkey
    }
})
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.Bucket, // 버킷 이름
        key: function (요청, file, cb) {
            cb(null, Date.now().toString()) // 업로드시 파일명
        }
    })
})

// DB 내용 사용하기
const { ObjectId } = require("mongodb");
const connectDB = require('./../database.js');
let db;
connectDB.then((client) => {
    db = client.db('forum')
}).catch((err) => {
    console.log(err)
});

// 리스트
router.get('/list/:pageNum', async (req, res) => {
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

// 글쓰기
router.get('/write', (req, res) => {
    res.render('write.ejs', {});
})

// 이미지 업로드 기능인 upload.single('img1') 함수를 미들웨어로 호출 (아규먼트는 input 태그의 name)
// 여러개의 이미지를 업로드하려면 upload.array('img1', 2) 함수 사용 (2번째 아규먼트는 최대 파일 개수)
router.post('/newposting', upload.single('img1'), async (req, res) => {
    // console.log(req.file); // 이미지의 크기 url 등의 정보가 전달됨
    let img_url = req.file?.location;
    /* 단, 이미지 업로드 기능에 대해 에러 처리를 하기 위해서는 미들웨어가 아닌 다음과 같이 일반 함수로 호출
    upload.single('img1')(req, res, (err) => {
        if(err) return res.send('upload err');
        else{
            // 이미지 업로드 완료 시 실행할 코드(본문 전체)
        }
    })
    */

    // req.body 사용해서 form 태그의 input 내용들 불러오기 (오브젝트 형태 {input_name: 내용, ...})
    // db에 데이터 저장(삽입)하는 법 (데이터는 오브젝트 형태로 저장)
    if (req.body.title.length == 0) res.redirect('/write');
    else {
        await db.collection('post').insertOne({ title: req.body.title, content: req.body.content, img: img_url });
        // 리다이렉트
        res.redirect('/write');
    }
})

// url parameter 사용법~ (/:작명, 여러개 사용 가능)
router.get('/detail/:postID', async (req, res) => {
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

router.get('/update/:postID', async (req, res) => {
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
router.put('/updating/:postID', async (req, res) => {
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

router.delete('/deleting', async (req, res) => {
    // query string 문법 사용
    await db.collection('post').deleteOne({ _id: new ObjectId(req.query.postID) });
    // deleteOne, deleteMany: updateOne, updateMany 문법과 동일

    // 삭제 후 리스트 페이지로 리다이렉트 하기 (ajax 통신 후 res.redirect, res.render 안됨)
    res.json({ redirectURL: '/list/1' }); // 클라이언트에게 리다이렉트할 경로 전달
})

// 검색 기능
router.get('/search', async (req, res) => {
    // $regex 옵션으로 정규식 검색하기
    // let result = await db.collection('post').find({ title: { $regex: req.query.target } }).toArray();

    // 인덱스로 검색하기 (정확한 단어만 검색 가능함)
    // let result = await db.collection('post').find({ $text: { $search: req.query.target } })

    // search index 사용해서 검색하기
    // 검색 조건 설정
    let search_condition = [
        {
            $search: {
                index: "title_search_index",
                text: { query: req.query.target, path: 'title' }
            }
        }
        // 다른 검색 조건 추가 가능
    ];
    // aggregate 함수와 검색 조건을 사용해서 검색
    let result = await db.collection('post').aggregate(search_condition).toArray();
    res.render('search.ejs', { posts: result, page: req.query.page, target: req.query.target });
})

module.exports = router;