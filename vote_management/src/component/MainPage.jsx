import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

axios.defaults.withCredentials = true;

function MainPage(props) {
  const [isClicked, setIsClicked] = useState(null);
  const [isAuth, setAuth] = useState(null);
  const navigate = useNavigate();

  const handleClick = (name) => {
    setIsClicked(name);
  };

  useEffect(() => {
    axios
      .post("http://localhost:8080/admin")
      .then((res) => {
        const status = res.data.status;
        console.log(status);
        if (status === "Admin" || status === "User") {
          setAuth(status);
        } else {
          setAuth(status);
          alert("권한없음");
          navigate("/");
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "25vh",
        justifyContent: "center",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <button
          style={{ margin: "10px", padding: "15px 30px", fontSize: "16px" }}
          onClick={() => handleClick("Submit")}
        >
          vote
        </button>
        <button
          style={{ margin: "10px", padding: "15px 30px", fontSize: "16px" }}
          onClick={() => handleClick("Result")}
        >
          result
        </button>
        {isAuth === "Admin" && (
          <button
            style={{ margin: "10px", padding: "15px 30px", fontSize: "16px" }}
            onClick={() => handleClick("AdminButton")}
          >
            admin
          </button>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        {isClicked === "Submit" ? (
          <Submit />
        ) : isClicked === "Result" ? (
          <Result />
        ) : isClicked === "AdminButton" ? (
          <AdminButton />
        ) : null}
      </div>
    </div>
  );
}

function Submit(props) {
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    axios
      .post("http://localhost:8080/getCandidate")
      .then((res) => {
        if (res.data == "finish") {
          alert("투표 종료");
          setData(null);
        }
        setData(res.data);
      })
      .catch((e) => {
        console.error(e);
      });
  }, []);

  const onSubmitHandler = (name, event) => {
    event.preventDefault();
    let body = {
      pollId: 1,
      choice: name,
    };
    axios.post("http://localhost:8080/api/vote", body).then((res) => {
      // Assuming res.data contains updated data after voting
      const json = res.data;
      setData(json);
      if (json.isStatus == "False") {
        alert("세션 오류");
        navigate("/");
      } else {
        alert("투표 완료!!");
        return <MainPage />;
      }
    });
  };

  return (
    <div>
      {Array.isArray(data) &&
        data.map((item) => (
          <div key={item.num}>
            <li>{item.name}</li>
            <button
              name={item.num}
              onClick={(event) => onSubmitHandler(item.num, event)}
            >
              {item.num} 번 투표
            </button>
          </div>
        ))}
    </div>
  );
}

function Result(props) {
  const [dataArray, setDataArray] = useState([]);
  useEffect(() => {
    axios
      .get("http://localhost:8080/api/polls/result")
      .then((res) => {
        const count = res.data;
        console.log(count);
        var dataArr = Object.keys(count).map((key) => {
          return { id: key, count: count[key] };
        });
        console.log(dataArr);
        setDataArray(dataArr);
      })
      .catch((e) => {
        console.error(e);
      });
  }, []);

  return (
    <div>
      {dataArray.map((item) => (
        <div key={item.id}>
          <p>ID: {item.id}</p>
          <p>Count: {item.count}</p>
        </div>
      ))}
    </div>
  );
}

function AdminButton(props) {
  const [isClicked, setIsClicked] = useState(null);
  const handleClick = (name) => {
    setIsClicked(name);
  };
  return (
    <>
      <div>
        <button onClick={() => handleClick("Time")}>시간설정</button>
        <button onClick={() => handleClick("Add")}>투표자 추가</button>
      </div>
      <div>
        {isClicked === "Time" ? <Time /> : isClicked === "Add" ? <Add /> : null}
      </div>
    </>
  );
}

function Time(props) {
  const [value, isValue] = useState("");
  useEffect(() => {
    axios
      .post("http://localhost:8080/getDB")
      .then((res) => {
        const result = res.data.date;
        if (result != null) {
          isValue(formatDate(result));
        } else {
          isValue(result);
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }, []);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const formatDate = (date) => {
    const year = date.getFullYear();
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    var month = monthNames.indexOf(monthNames[date.getMonth()]) + 1;
    if (month < 10) {
      month = "0" + month;
    }
    const day = date.getDate().toString().padStart(2, "0");
    const selectDate = `${year}-${month}-${day}`;
    return selectDate;
  };
  const date = formatDate(selectedDate);

  const onSubmitHandler = (date, event) => {
    event.preventDefault();

    let body = {
      data: date,
    };
    axios.post("http://localhost:8080/admin/timeSet", body).then((res) => {
      alert(res.data.status);
    });
  };
  console.log(formatDate(selectedDate));

  return (
    <>
      <DatePicker
        dateFormat="yyyy.MM.dd"
        shouldCloseOnSelect
        minDate={new Date("2000-01-01")}
        maxDate={new Date("2026-01-01")}
        selected={selectedDate}
        onChange={(date) => setSelectedDate(date)}
      />
      <div>
        <button onClick={(event) => onSubmitHandler(date, event)}>확정</button>
      </div>
      <div>{value}</div>
    </>
  );
}

function Add(props) {
  return <div>추가</div>;
}

export default MainPage;
