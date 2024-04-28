const express = require('express')
const session = require('express-session');
const cookieParser = require('cookie-parser');
const app = express()
const bodyParser = require('body-parser'); 
const db = require('./lib/db');
const bcrypt = require('bcrypt');
const sessionOption = require('./lib/sessionOption');

var MySQLStore = require('express-mysql-session')(session);
var sessionStore = new MySQLStore(sessionOption);
const cors = require('cors');

// app.use(cors({
//     origin: '*', // 출처 허용 옵션
//     credential: 'true' // 사용자 인증이 필요한 리소스(쿠키 ..등) 접근
// }));
app.use(session({  
	key: 'session_cookie_name',
    secret: '~',
    resave: false,
	saveUninitialized: false,
}))
app.use(cookieParser('session_cookie_name'));
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

app.listen(8080,()=>{ 
    console.log("server start!");
  })

function authenticationUser(session) {
    if(!session) return false;


    return session.roles.includes("User");
}

function authenticationAdmin(session) {
    if(!session) return false;


    return session.roles.includes("Admin");
}

function encrypt(data, secretKey) {
    const iv = require('crypto').randomBytes(16);
    const cipher = require('crypto').createCipheriv('aes-256-cbc', secretKey, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function calculateHash(data) {
    const hash = require('crypto').createHash('sha256'); // 64글자
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
}

app.get('/', function (req, res) {
  res.send('Hello World')
})

app.post("/login", (req, res) => { 
    const email = req.body.email;
    const password = req.body.password;
    const sendData = { isLogin: "" };
    var roles;
    db.query('SELECT * FROM user_tbl WHERE email = ?', [email], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {     
            bcrypt.compare(password , results[0].password, (err, result) => {    // 입력된 비밀번호가 해시된 저장값과 같은 값인지 비교
                if (result === true) { 
                    if(email == "admin"){
                        roles = "Admin";
                    }else{
                        roles = "User";
                    }
                    req.session.user = {
                        id: email,
                        roles: roles
                      };
                    console.log(req.session.user);
                    sendData.isLogin = "True"
                    res.send(sendData);
                    
                } else {
                    sendData.isLogin = "False";
                    res.send(sendData);
                }
            });
        }
        else{                               
            sendData.isLogin = "False"
            res.send(sendData);
        }
    })                      
});

app.post("/signIn", (req, res) => {
    const email = req.body.email;
    const username = req.body.name;
    const password = req.body.password;
    const sendData = {isSign: ""};

    db.query('SELECT * FROM user_tbl WHERE email = ?', [email], function(error, results, fields) { 
        if (error) throw error;
        if (results.length == 0) { 
            const hasedPassword = bcrypt.hashSync(password, 10);    // 입력된 비밀번호를 해시한 값        
            db.query('INSERT INTO user_tbl VALUES(?,?,?,?)', [email, username, hasedPassword, 0], function (error, data) {
            if (error) throw error;
            req.session.save(function () {                        
                sendData.isSign = "True"
                res.send(sendData);
            });
            });
        }
        else if(results.length > 0){                                              
            sendData.isSign = "이미 존재하는 아이디 입니다!"
            res.send(sendData);  
        }else {
            sendData.isSign = "형식이 잘못되었습니다.";
            res.send(sendData);
        }
    });         
});

app.post("/getCandidate", async(req, res) => {
    try {
        db.query('SELECT set_time from time', async function(error, results, fields) {
            if(error) throw error;
            const endTime = results[0].set_time;
            const currentTime = new Date();
            if (currentTime > endTime) {
                res.json({status : "finish"});
            } else {
                const results = await new Promise((resolve, reject) => {
                    db.query('select * from candidate_tbl', function(error, results, fields){
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    });
                });
                res.json(results);
            }
        })

    } catch (e) {
        res.status(500).json({error : 'server error'});
    }
});


app.post('/api/vote', (req, res) => {
    const {pollId, choice } = req.body;
    const secretKey = "00000000000000000000000000000000"; // process.env.ENCRYPTION_SECRET;
    const encryptedChoice = encrypt(choice, secretKey);// 투표 데이터 암호화
    const voteHash = calculateHash(choice + secretKey);// 투표 결과 해시 계산

    const userId = req.session.user.id;

    const sendData = { isStatus: "" };
    // 세션 확인
    if (req.session.user) {
        // 이미 투표한 사용자인지 검증
        db.query('SELECT confirm FROM user_tbl WHERE email = ?', [userId], (e, r) => {
            if (e) {
                // 500
            } else if (r[0].confirm == '1') {
                sendData.isStatus = "AlreadyVoted";
                res.json(sendData);
            } else {
                // 암호화된 투표 데이터와 해시 값을 db에 저장
                db.query('INSERT INTO votes (poll_id, encrypted_choice, hash) VALUES (?, ?, ?)', [pollId, encryptedChoice, voteHash], (e, r) => {
                    if (e) {
                        console.log(e, r);
                        res.status(500).json({error: 'server error'});
                    } else {
                        db.query('UPDATE user_tbl SET confirm = 1 WHERE email = ?', [userId], (e, r) => {
                            if (e) {
                                // 500
                            } else {
                                sendData.isStatus = "True"
                                res.json(sendData);
                            }
                        });
                    }
                });
            }
        });
    } else {
        sendData.isStatus = "False";
        res.json(sendData);
    }
})

app.post("/admin", async (req, res) => { 
    try {
        if(authenticationAdmin(req.session.user)) {
            return res.json({ status : "Admin"});
        }else if(authenticationUser(req.session.user)){
            return res.json({status : "User"});
        }else{
            return res.json({status : "False"});
        }

    } catch (error) {
        // 오류 처리
        res.status(500).send({ error: error.message });
    }
});

// 사용자 인가된 사람
app.post("/user", async (req, res) => { 
    try {
        if(authenticationUser(req.session.user)) {
            // ~
        }

    } catch (error) {
        // 오류 처리
        res.status(500).send({ error: error.message });
    }
});


app.post("/admin/timeSet", (req, res) => {
    const date = req.body.data;
    console.log(date);
    db.query('select * from time', function(error, results, fields){
        if(error) throw error;
        if(results.length == 0){
            db.query('insert into time (set_time) values(?)',[date], function(error, results, fields){
                return res.json({
                    status : "등록 완료",
                    finDate : date
                })
            })
        }else{
            db.query('update time set set_time = ?', [date], function(error, results, fields){
                if(error) throw error;
                return res.json({
                    status : "업뎃 완료",
                    finDate : date
                })            
            })
        }
        db.query('update user_tbl set confirm = 0', [date], function(error, results, fields){
            if(error) throw error;
            
        })
        
    });
})

app.post("/getDB", (req, res) => {
    db.query('select * from time', function(error, results, fields){
        console.log(results[0].set_time);
        if(error) throw error;
        if(results.length == 0){
            return res.json({
                date : results[0].set_time
            })
        }else{
            return res.json({
                date : "null"
            })
        }
    })

})


function decrypt(encryptedData, secretKey) {
    const [ivHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = require('crypto').createDecipheriv('aes-256-cbc', secretKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}


app.get("/api/polls/result", (req, res) => {
    // 투표 종료 시간 확인
    db.query('select set_time from time', (err, results) => {
        if (err) {
            // 500
        } else if (results.length === 0) {
            // 404
        } else {
            const endTime = results[0].set_time;
            const currentTime = new Date();
            //2024-05-03T15:00:00.000Z
            // console.log(endTime);
            // console.log(currentTime);
            if (currentTime < endTime) { // 결과 못봄
                // 403
            } else { // 투표 종료 시간 지남
                // 투표 결과 집계
                db.query('select encrypted_choice, hash from votes', (e, r) => { // encrypted_choice, hash
                    if (e) {
                        // 500
                        console.log(e);
                    } else {
                        const secretKey = '00000000000000000000000000000000';
                        const choices = r.map(vote => {
                            const encryptedChoice = vote.encrypted_choice;
                            const storedHash = vote.hash;
                            const decryptedChoice = decrypt(encryptedChoice, secretKey);
                            const calculatedHash = calculateHash(decryptedChoice + secretKey);

                            console.log(typeof(decryptedChoice), storedHash, calculatedHash);
                            if (storedHash === calculatedHash) {
                                return decryptedChoice;
                            } else {
                                // 투표 무결성 훼손된 경우 처리
                                console.warn("무결성 훼손");
                                return null;
                            }
                        });

                        // 투표 결과 집계
                        const resultCounts = choices.reduce((counts, choice) => {
                            counts[choice] = (counts[choice] || 0) + 1; 
                            return counts;
                        }, {});

                        console.log(resultCounts);
                        res.status(200).json(resultCounts);
                    }
                });
            }
        }
    });
})

/*

1. 투표 결과 화면 출력 - o 
2. 관리자 페이지 시간 문제 해결 - x
3. 인당 투표 한번씩만 가능하게 - o
4. 투표 종료 후 투표 요청이 오면 해당 투표 무효 - o
5. 새로운 투표 생성 시 재투표 가능하게 해야함 - o

효율적인 데이터 관리와 조회를 위한 적절한 스키마 설계와 쿼리 최적화, mysql
제한된 자원(CPU, 메모리, 네트워크 대역폭)을 가지고 있으므로, 대규모 요청에 대한 자원관리가 필요, express
자원관리 측면에서 보안 또한 중요한 요소이므로, 시스템의 안정성과 데이터의 기밀성을 유지하기 위한 조치
이런걸 대충 ~~~~

최근 총선을 보고 투표율을 확인해 봤는데 젊은 층의 투표율이 적게 나왔다.
이런 모습을 보며 직접 가서 투표 할 필요없이 집에서 인터넷으로로 투표를 한다면 젊은 층의 투표율도 늘것 같다는 생각을 했다.
블록체인을 사용하면 간편하게 신뢰성있는 투표 시스템을 구현할 수 있지만 소규모 투표 시스템에서 블록체인을 사용하는 것은 투표 결과 집계의 효율성 측면에서 오버헤드가 크다.
그래서 블록체인을 사용하지 않고 중앙 집중식 서버 구조를 유지한 채로 신뢰성있는(무결성, 기밀성) 온라인 투표 시스템을 개발해 보고 싶었다.

투표 결과의 무결성 보장을 위해 SHA-256 해시 알고리즘을 사용했다. 2024년 기준 충돌/역상 저항성이 높은 해시 알고리즘으로서, 투표 데이터를 해시로 난독화 후 데이터베이스에 저장하고, 투표 결과 집계 시 저장된 해시 값과 복호화된 투표 결과의 해시 값을 비교하여 데이터의 변조 여부를 검증했다.
기밀성 보장을 위해서 AES-256-CBC 대칭키 암호화 알고리즘을 사용했다. 가장 보편적이고 안전성이 높은 것으로 알려져 있으며, CBC모드를 사용해 패턴 분석을 어렵게 할 수 있다. 또한 매 암호화마다 랜덤한 IV를 사용하여 동일한 평문이라도 매번 다른 암호문이 생성되어 그 어디에도 투표 결과 평문을 저장하지 않을 수 있다.




*/




// app.get("/api/polls/result", (req, res) => {
//     // 투표 종료 시간 확인
//     db.query('select set_time from time', (err, results) => {
//         if (err) {
//             // 500 에러 처리
//             res.status(500).send("Internal Server Error");
//         } else if (results.length === 0) {
//             // 404 에러 처리
//             res.status(404).send("Not Found");
//         } else {
//             const endTime = results[0].set_time;
//             const currentTime = new Date();
            
//             if (currentTime < endTime) { // 결과 못봄
//                 // 403 에러 처리
//                 res.status(403).send("Forbidden");
//             } else { // 투표 종료 시간 지남
//                 // 투표 결과 집계
//                 db.query('select encrypted_choice, hash from votes', (e, r) => { // encrypted_choice, hash
//                     if (e) {
//                         // 500 에러 처리
//                         res.status(500).send("Internal Server Error");
//                     } else {
//                         const secretKey = ''; // 비밀 키를 설정하세요.
//                         const choices = r.map(vote => {
//                             // 투표 선택 결과 처리
//                             const storedHash = vote.hash;
//                             const decryptedChoice = decrypt(vote.encrypted_choice, secretKey); // 복호화 함수를 적절히 구현하세요.
//                             const calculatedHash = calculateHash(decryptedChoice); // 해시 계산 함수를 적절히 구현하세요.
                            
//                             if (storedHash === calculatedHash) {
//                                 return decryptedChoice;
//                             } else {
//                                 // 투표 무결성 훼손된 경우 처리
//                                 return null; // 또는 적절한 오류 처리
//                             }
//                         });
                        
//                         // 올바르게 처리된 투표 결과 전송
//                         res.status(200).json({ choices });
//                     }
//                 });
//             }
//         }
//     });
// });

// // 복호화 함수 구현
// function decrypt(encryptedData, secretKey) {
//     // 적절한 복호화 알고리즘을 사용하여 encryptedData를 복호화한 후 반환하세요.
// }

// // 해시 계산 함수 구현
// function calculateHash(data) {
//     // 적절한 해시 알고리즘을 사용하여 data의 해시를 계산한 후 반환하세요.
// }


/*
 post '/api/vote'
    1. 사용자 인증 및 권한 확인
    2. 투표 데이터 암호화(기밀성)
    3. 투표 결과 해시 계산(무결성 확인)
    4. db에 저장

 get '/api/polls/:pollId/result'
    1. 투표 종료 시간 확인
    2. 투표 결과 집계
    3. 투표 무결성이 훼손된 경우 처리
    4. 결과 전송

 post '/api/admin/polls'
    1. 관리자 인증, 권한 확인, 시간 설정
    2. 새로운 투표 생성

1. 무결성
    - 블록체인(불가능)
    - 해시
2. 기밀성
    - 종단간 암호화
    - 영지식 증명(생략)
    - 익명 투표(취지에 안맞음)

*/