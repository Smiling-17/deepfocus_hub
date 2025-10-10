import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import FocusArenaPage from "./pages/FocusArenaPage.jsx";
import SessionReviewPage from "./pages/SessionReviewPage.jsx";
import StatisticsPage from "./pages/StatisticsPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dang-nhap" replace />} />
        <Route path="/dang-nhap" element={<LoginPage />} />
        <Route path="/dang-ky" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/bang-dieu-khien" element={<DashboardPage />} />
          <Route path="/khong-gian-tap-trung" element={<FocusArenaPage />} />
          <Route path="/danh-gia-phien/:sessionId" element={<SessionReviewPage />} />
          <Route path="/thong-ke" element={<StatisticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dang-nhap" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
