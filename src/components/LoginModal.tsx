import React, { useEffect, useRef, useState } from "react";
import { Mail, ShieldAlert, Check, Lock, Chrome, BadgeCheck } from "lucide-react";
import { User } from "../types";
import { LoginRequest } from "../lib/auth";
import { turnstileSiteKey } from "../lib/firebase";

interface LoginModalProps {
  onClose: () => void;
  onLogin: (credentials: LoginRequest) => Promise<void> | void;
  currentUser: User | null;
  firebaseConfigured: boolean;
  loginError: string | null;
  canClose: boolean;
}

export default function LoginModal({
  onClose,
  onLogin,
  currentUser,
  firebaseConfigured,
  loginError,
  canClose,
}: LoginModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [firebaseAction, setFirebaseAction] = useState<"signIn" | "register">("signIn");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !turnstileSiteKey || !turnstileRef.current) {
      return;
    }

    const scriptId = "cloudflare-turnstile-script";
    const renderWidget = () => {
      const turnstile = (window as Window & { turnstile?: any }).turnstile;
      if (!turnstile || !turnstileRef.current) {
        return;
      }

      turnstileRef.current.innerHTML = "";
      turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        theme: "light",
        callback: (token: string) => {
          setTurnstileToken(token);
          setTurnstileError(null);
        },
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => {
          setTurnstileToken("");
          setTurnstileError("No se pudo cargar el captcha. Reintenta o revisa la clave Turnstile.");
        },
      });
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as Window & { turnstile?: any }).turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener("load", renderWidget, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.body.appendChild(script);
  }, [firebaseConfigured]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    void (async () => {
      try {
        await onLogin({
          provider: "firebase",
          action: firebaseAction,
          email: emailInput,
          password: passwordInput,
          displayName: displayNameInput,
          turnstileToken,
        });
        setSubmitSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (error) {
        setTurnstileError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
      }
    })();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-150">
          <div className="flex items-center space-x-2">
            <Mail className="text-indigo-650" size={22} />
            <div>
              <h3 className="font-extrabold text-slate-850 text-lg leading-tight">Accede a tu cuenta</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solo autenticación Firebase</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (canClose) {
                onClose();
              }
            }}
            disabled={!canClose}
            className={`p-1 px-3 border rounded-lg text-xs font-bold transition-all ${
              canClose
                ? "border-slate-200 text-slate-400 hover:text-slate-800 cursor-pointer"
                : "border-slate-100 text-slate-300 cursor-not-allowed"
            }`}
          >
            {canClose ? "Cerrar" : "Inicio de sesión obligatorio"}
          </button>
        </div>

        {currentUser && (
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between leading-none">
            <div className="flex items-center space-x-2.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Connected as</p>
                <p className="text-xs font-black text-slate-850 mt-1">@{currentUser.username}</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500 text-white rounded-full px-2.5 py-0.5 font-bold font-sans">
              ● Active
            </span>
          </div>
        )}

        {(loginError || turnstileError) && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold leading-relaxed">
            {loginError || turnstileError}
          </div>
        )}

        {submitSuccess ? (
          <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-150 space-y-2">
            <Check size={28} className="mx-auto text-emerald-500 animate-bounce" />
              <h4 className="text-sm font-bold text-emerald-900">Sesión iniciada correctamente</h4>
            <p className="text-xs text-emerald-705">Sincronizando tu sesión autenticada...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setFirebaseAction("signIn")}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  firebaseAction === "signIn" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setFirebaseAction("register")}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  firebaseAction === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Create account
              </button>
            </div>

            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-[#475569] block mb-1">
                Correo
              </label>
              <input
                type="email"
                required
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-[#475569] block mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>

            {firebaseAction === "register" && (
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-[#475569] block mb-1">
                  Nombre visible
                </label>
                <input
                  type="text"
                  placeholder="Nombre público"
                  className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                />
              </div>
            )}

            {turnstileSiteKey ? (
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-[#475569] block mb-1">
                  Desafío de seguridad
                </label>
                <div ref={turnstileRef} className="min-h-19.5" />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-semibold leading-relaxed">
                Turnstile no está configurado. Define `VITE_TURNSTILE_SITE_KEY` para habilitar el captcha.
              </div>
            )}

            <div className="flex gap-2 pt-2">
                <button
                type="button"
                onClick={async () => {
                  try {
                    setSubmitSuccess(false);
                    await onLogin({ provider: "firebase", action: "google", turnstileToken });
                    setSubmitSuccess(true);
                    setTimeout(onClose, 1200);
                  } catch (error) {
                    setTurnstileError(error instanceof Error ? error.message : "No se pudo usar Google.");
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
              >
                <Chrome size={14} />
                <span>Google</span>
              </button>
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-100 transition-all cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
              >
                <BadgeCheck size={14} />
                <span>{firebaseAction === "register" ? "Crear cuenta" : "Iniciar sesión"}</span>
              </button>
            </div>
          </form>
        )}

        <div className="p-3 bg-indigo-50 rounded-xl flex items-start space-x-2 text-[10px] text-indigo-905 font-medium leading-relaxed">
          <ShieldAlert size={14} className="shrink-0 mt-0.5" />
          <span>
            Firebase Auth protects the identity layer and Turnstile guards the login form.
          </span>
        </div>
      </div>
    </div>
  );
}
