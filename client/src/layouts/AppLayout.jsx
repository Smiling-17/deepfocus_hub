import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const publicLinks = [
  { to: "/dang-nhap", label: "Đăng nhập" },
  { to: "/dang-ky", label: "Đăng ký" }
];

const privateLinks = [
  { to: "/bang-dieu-khien", label: "Bảng điều khiển" },
  { to: "/khong-gian-tap-trung", label: "Không Gian Tập Trung" },
  { to: "/thong-ke", label: "Thống kê & Thành tựu" }
];

const AppLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const navLinks = isAuthenticated ? privateLinks : publicLinks;

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-900 transition-colors dark:text-slate-100">
      <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(29,78,216,0.14),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.18),_transparent_50%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_50%),radial-gradient(circle_at_bottom,_rgba(109,40,217,0.25),_transparent_50%)]" />

      <a
        href="#noi-dung-chinh"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Bỏ qua điều hướng
      </a>

      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl transition dark:border-slate-800/60 dark:bg-slate-950/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link
            to={isAuthenticated ? "/bang-dieu-khien" : "/"}
            className="group inline-flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 font-semibold text-primary shadow-sm ring-1 ring-primary/10 transition hover:-translate-y-[1px] hover:shadow-glow dark:bg-slate-950/70 dark:text-primary-light"
            onClick={closeMenu}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary via-indigo-500 to-sky-500 p-[2px] shadow-lg">
              <img
                src="/Calistya.png"
                alt="DeepFocus Hub logo"
                className="h-full w-full rounded-full border border-white/70 object-cover shadow-sm dark:border-slate-700/80"
              />
            </span>
            <div className="flex flex-col leading-tight">
              <span>DeepFocus Hub</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-300">
                Tập trung sâu – bứt phá mỗi ngày
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <p className="hidden text-sm font-semibold text-slate-600 dark:text-slate-300 md:block">
                Xin chào, <span className="text-primary">{user?.username}</span>
              </p>
            )}
            <nav className="hidden items-center gap-2 md:flex" aria-label="Điều hướng chính">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    [
                      "relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:ring-offset-slate-900",
                      isActive
                        ? "bg-gradient-to-r from-primary to-indigo-500 text-white shadow-glow"
                        : "text-slate-700 hover:bg-white/70 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900/60"
                    ].join(" ")
                  }
                >
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-indigo-500 opacity-70" />
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/60 px-4 py-2 text-sm font-semibold text-red-500 transition hover:border-red-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-red-500/40 dark:bg-slate-900/80 dark:text-red-300"
                >
                  ⏻ Đăng xuất
                </button>
              )}
            </nav>
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/80 p-2 text-slate-700 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              onClick={handleToggleMenu}
              aria-label="Mở menu điều hướng"
              aria-expanded={isMenuOpen}
            >
              <span aria-hidden="true">{isMenuOpen ? "✖" : "☰"}</span>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <nav
            className="border-t border-white/40 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-950/80"
            aria-label="Điều hướng phụ"
          >
            <ul className="flex flex-col gap-2">
              {isAuthenticated && (
                <li className="rounded-2xl bg-white/60 px-4 py-2 text-sm font-semibold text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
                  👋 Xin chào, {user?.username}
                </li>
              )}
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      [
                        "block rounded-2xl px-4 py-2 text-sm font-semibold transition",
                        isActive
                          ? "bg-gradient-to-r from-primary to-indigo-500 text-white shadow-glow"
                          : "text-slate-700 hover:bg-white/70 hover:text-primary dark:text-slate-200 dark:hover:bg-slate-900/70"
                      ].join(" ")
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              {isAuthenticated && (
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-2xl px-4 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-red-300 dark:hover:bg-slate-900/80"
                  >
                    Đăng xuất
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </header>

      <main id="noi-dung-chinh" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
        <Outlet />
      </main>

      <footer className="relative overflow-hidden border-t border-white/30 bg-white/70 py-8 text-center text-sm text-slate-600 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-400">
        <div className="pointer-events-none absolute inset-x-1/2 top-0 h-20 w-[120%] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-aurora-emerald/20 blur-3xl" />
        <p className="relative z-10">
          © {new Date().getFullYear()} DeepFocus Hub — Sáng tạo không gian để bạn tập trung sâu và sống hiệu quả hơn mỗi ngày.
        </p>
      </footer>
    </div>
  );
};

export default AppLayout;
