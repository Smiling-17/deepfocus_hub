import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "classnames";
import AnimatedInput from "../components/AnimatedInput.jsx";
import { apiClient, getErrorMessage } from "../utils/apiClient.js";

const initialFormState = {
  username: "",
  password: "",
  confirmPassword: ""
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
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

  const validate = () => {
    const newErrors = {};
    const trimmedUsername = formValues.username.trim();

    if (!trimmedUsername) {
      newErrors.username = "Vui lòng nhập tên đăng nhập.";
    } else if (trimmedUsername.length < 3) {
      newErrors.username = "Tên đăng nhập phải có ít nhất 3 ký tự.";
    }

    if (!formValues.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (formValues.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (!formValues.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    } else if (formValues.password !== formValues.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
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

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/users/register", {
        username: formValues.username.trim(),
        password: formValues.password,
        confirmPassword: formValues.confirmPassword
      });

      navigate("/dang-nhap", {
        replace: true,
        state: {
          justRegistered: true,
          username: formValues.username.trim()
        }
      });
      setFormValues(initialFormState);
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.includes("đã được sử dụng")) {
        setErrors((prev) => ({
          ...prev,
          username: message
        }));
      } else {
        setFormError(message);
      }
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
            <p className="auth-form__eyebrow">Chào mừng bạn</p>
            <h1 className="auth-form__title">Tạo tài khoản</h1>
            <p className="auth-form__subtitle">
              Mở khóa trải nghiệm DeepFocus Hub cá nhân hóa. Chỉ vài bước để bắt
              đầu hành trình tập trung sâu mỗi ngày.
            </p>
          </header>

          {formError && (
            <div className="auth-banner auth-banner--error" role="alert">
              {formError}
            </div>
          )}

          <AnimatedInput
            label="Tên đăng nhập"
            id="register-username"
            name="username"
            autoComplete="username"
            value={formValues.username}
            onChange={handleChange}
            error={errors.username}
          />
          <AnimatedInput
            label="Mật khẩu"
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={formValues.password}
            onChange={handleChange}
            error={errors.password}
          />
          <AnimatedInput
            label="Xác nhận mật khẩu"
            id="register-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formValues.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />

          <button
            type="submit"
            className="styled-button"
            disabled={isSubmitting}
          >
            <span className="styled-button__real-text-holder">
              <span className="styled-button__real-text">
                {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
              </span>
              <span className="styled-button__moving-block face">
                <span className="styled-button__text-holder">
                  <span className="styled-button__text">
                    {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
                  </span>
                </span>
              </span>
              <span className="styled-button__moving-block back">
                <span className="styled-button__text-holder">
                  <span className="styled-button__text">
                    {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
                  </span>
                </span>
              </span>
            </span>
          </button>

          <p className="auth-form__footer">
            Đã có tài khoản?{" "}
            <Link to="/dang-nhap" className="auth-form__link">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </form>
    </section>
  );
};

export default RegisterPage;
