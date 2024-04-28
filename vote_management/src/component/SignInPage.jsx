import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function SignInPage(props) {
  const [Email, setEmail] = useState("");
  const [Name, setName] = useState("");
  const [Password, setPassword] = useState("");
  const [ConfirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const onEmailHandler = (event) => {
    setEmail(event.currentTarget.value);
  };
  const onNameHandler = (event) => {
    setName(event.currentTarget.value);
  };
  const onPasswordHandler = (event) => {
    setPassword(event.currentTarget.value);
  };
  const onConfirmPasswordHandler = (event) => {
    setConfirmPassword(event.currentTarget.value);
  };

  const onSubmitHandler = (event) => {
    event.preventDefault();

    if (!Email) {
      return alert("이메일을 입력하세요.");
    } else if (!Name) {
      return alert("이름을 입력하세요.");
    } else if (!Password) {
      return alert("비밀번호를 입력하세요.");
    } else if (!ConfirmPassword) {
      return alert("확인 비밀번호를 입력하세요.");
    } else if (!(Password == ConfirmPassword)) {
      return alert("비밀번호와 확인비밀번호가 다릅니다.");
    } else {
      let body = {
        email: Email,
        name: Name,
        password: Password,
      };

      try {
        axios.post("http://localhost:8080/signIn", body).then((res) => {
          const json = res.data; // 응답 데이터에 접근합니다.
          if (json.isSign === "True") {
            alert("회원가입 성공");
            navigate("/");
          } else {
            alert(json.isSign);
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
        <label>Name</label>
        <input type="text" value={Name} onChange={onNameHandler} />
        <label>Password</label>
        <input type="password" value={Password} onChange={onPasswordHandler} />
        <label>Confirm Password</label>
        <input
          type="password"
          value={ConfirmPassword}
          onChange={onConfirmPasswordHandler}
        />
        <br />
        <button formAction="">join</button>
      </form>
    </div>
  );
}

export default SignInPage;
