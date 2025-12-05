import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext.jsx";
import Apply from "./pages/Apply.jsx";
import Booking from "./pages/Booking.jsx";
import Detail from "./pages/Detail.jsx";
import List from "./pages/List.jsx";
import Home from "./pages/Home.jsx";
import App from "./App.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import MyPage from "./pages/MyPage.jsx";
import EditCarer from "./pages/EditCarer.jsx";
import MyBookingDetail from "./pages/MyBookingDetail.jsx";
import CareRequests from "./pages/CareRequests.jsx";
import BoardList from "./pages/board/BoardList.jsx";
import BoardDetail from "./pages/board/BoardDetail.jsx";
import BoardWrite from "./pages/board/BoardWrite.jsx";
import BoardEdit from "./pages/board/BoardEdit.jsx";
import SeoAnimalCare from "./pages/SeoAnimalCare";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/list", element: <List /> },
      { path: "/detail/:id", element: <Detail /> },
      { path: "/booking/:id", element: <Booking /> },
      { path: "/apply", element: <Apply /> },
      { path: "/auth", element: <AuthPage /> },
      { path: "/mypage", element: <MyPage /> },
      { path: "/carer/edit/:id", element: <EditCarer /> },
      { path: "/mybooking/:id", element: <MyBookingDetail /> },
      { path: "/care-requests", element: <CareRequests /> },
      { path: "/board", element: <BoardList /> },
      { path: "/board/:category", element: <BoardList /> },
      { path: "/board/post/:id", element: <BoardDetail /> },
      { path: "/board/write", element: <BoardWrite /> },
      { path: "/board/edit/:id", element: <BoardEdit /> },
      { path: "/seo/animal-care", element: <SeoAnimalCare /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
