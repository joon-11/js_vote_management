import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function LoginPage() {
  const [Email, setEmail] = useState("");
  const [Password, setPassword] = useState("");
  const navigate = useNavigate();

  const onEmailHandler = (event) => {
    setEmail(event.currentTarget.value);
  };
  const onPasswordHandler = (event) => {
    setPassword(event.currentTarget.value);
  };

  const onSubmitHandler = (event) => {
    event.preventDefault();

    if (!Email) {
      return alert("이메일을 입력하세요.");
    } else if (!Password) {
      return alert("비밀번호를 입력하세요.");
    } else {
      let body = {
        email: Email,
        password: Password,
      };

      try {
        axios
          .post("http://localhost:8080/login", body, {
            withCredentials: true,
          })
          .then((res) => {
            const json = res.data; // 응답 데이터에 접근합니다.
            if (json.isLogin === "True") {
              navigate("/MainPage");
            } else {
              alert("로그인 정보가 틀렸습니다.");
            }
          });
      } catch (error) {
        console.error("Error submitting form:", error);
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100vh",
      }}
    >
      <form
        style={{ display: "flex", flexDirection: "column" }}
        onSubmit={onSubmitHandler}
      >
        <label>Email</label>
        <input type="text" value={Email} onChange={onEmailHandler} />
        <label>Password</label>
        <input type="password" value={Password} onChange={onPasswordHandler} />
        <br />
        <button>Login</button>
        <br />
        <Link to="/SignIn">
          <button
            style={{
              fontSize: "14px",
              padding: "1px 53px",
            }}
          >
            sign in
          </button>
        </Link>
      </form>
    </div>
  );
}

export default LoginPage;
