import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AnimatedInput from "../components/AnimatedInput.jsx";
import { apiClient, getErrorMessage } from "../utils/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import clsx from "classnames";

const initialValues = {
  username: "",
  password: ""
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [formValues, setFormValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setHasStarted(true), 100);
    const readyTimer = setTimeout(() => setIsReady(true), 1800);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    if (location.state?.justRegistered) {
      setInfoMessage(
        `Tạo tài khoản thành công! Hãy đăng nhập để khám phá DeepFocus Hub, ${
          location.state.username || "bạn"
        } nhé.`
      );
    }
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/bang-dieu-khien", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const newErrors = {};

    if (!formValues.username.trim()) {
      newErrors.username = "Vui lòng nhập tên đăng nhập.";
    }
    if (!formValues.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setInfoMessage("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post("/users/login", {
        username: formValues.username.trim(),
        password: formValues.password
      });

      login(response.data.token, response.data.user);

      const redirectPath = location.state?.from || "/bang-dieu-khien";
      navigate(redirectPath, {
        replace: true,
        state:
          redirectPath === "/bang-dieu-khien"
            ? { showWelcome: true }
            : undefined
      });
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.includes("không chính xác")) {
        setErrors({ password: message });
      } else {
        setErrors({});
      }
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerClass = useMemo(
    () =>
      clsx("auth-form", {
        "auth-form--start": hasStarted,
        "auth-form--ready": isReady
      }),
    [hasStarted, isReady]
  );

  return (
    <section className="auth-scene">
      <div className="auth-scene__halo" aria-hidden />
      <form className={containerClass} noValidate onSubmit={handleSubmit}>
        <div className="auth-form__cover" aria-hidden />
        <div className="auth-form__loader" aria-hidden>
          <div className="auth-spinner active">
            <svg className="auth-spinner__circular" viewBox="25 25 50 50">
              <circle
                className="auth-spinner__path"
                cx="50"
                cy="50"
                r="20"
                fill="none"
                strokeWidth="4"
                strokeMiterlimit="10"
              />
            </svg>
          </div>
        </div>
        <div className="auth-form__content">
          <header className="auth-form__header">
            <p className="auth-form__eyebrow">Chào mừng trở lại</p>
            <h1 className="auth-form__title">Đăng nhập</h1>
            <p className="auth-form__subtitle">
              Sẵn sàng quay lại nhịp Deep Work? Hoàn tất thông tin dưới đây để
              tiếp tục hành trình tập trung.
            </p>
          </header>

          {infoMessage && (
            <div className="auth-banner auth-banner--success" role="status">
              {infoMessage}
            </div>
          )}
          {formError && (
            <div className="auth-banner auth-banner--error" role="alert">
              {formError}
            </div>
          )}

          <AnimatedInput
            label="Tên đăng nhập"
            id="login-username"
            name="username"
            autoComplete="username"
            value={formValues.username}
            onChange={handleChange}
            error={errors.username}
          />

          <AnimatedInput
            label="Mật khẩu"
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={formValues.password}
            onChange={handleChange}
            error={errors.password}
          />

          <button
            type="submit"
            className="styled-button"
            disabled={isSubmitting}
          >
            <span className="styled-button__real-text-holder">
              <span className="styled-button__real-text">
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </span>
              <span className="styled-button__moving-block face">
                <span className="styled-button__text-holder">
                  <span className="styled-button__text">
                    {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                  </span>
                </span>
              </span>
              <span className="styled-button__moving-block back">
                <span className="styled-button__text-holder">
                  <span className="styled-button__text">
                    {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                  </span>
                </span>
              </span>
            </span>
          </button>

          <p className="auth-form__footer">
            Chưa có tài khoản?{" "}
            <Link to="/dang-ky" className="auth-form__link">
              Tạo tài khoản mới
            </Link>
          </p>
        </div>
      </form>
    </section>
  );
};

export default LoginPage;
