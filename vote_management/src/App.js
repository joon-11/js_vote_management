import './App.css';
import LoginPage from './component/LoginPage';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SignInPage from './component/SignInPage';
import MainPage from './component/MainPage';


function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route index element={<LoginPage/>}/>
      <Route path="/SignIn" element={<SignInPage/>}/>
      <Route path='/MainPage' element={<MainPage/>}/>
    </Routes>
    </BrowserRouter>
  );
}

export default App; 