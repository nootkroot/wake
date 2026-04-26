export const SITE_LANGUAGE_COOKIE = "wake_lang";

export const SITE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Espanol" },
  { code: "fr", label: "Francais" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Portugues" },
  { code: "zh", label: "Chinese" },
] as const;

export type SiteLocale = (typeof SITE_LANGUAGES)[number]["code"];

type Messages = Record<string, string>;

const MESSAGES: Record<SiteLocale, Messages> = {
  en: {
    issues: "Issues",
    suggestions: "Suggestions",
    legislation: "Legislation",
    dashboard: "Dashboard",
    submit: "Submit",
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",
    checking_auth: "Checking auth...",
    signed_in: "Signed in",
    language: "Language",
    footer: "Wake · Hackathon edition · Anonymous voting · Verified submissions",
  },
  es: {
    issues: "Problemas",
    suggestions: "Sugerencias",
    legislation: "Legislacion",
    dashboard: "Panel",
    submit: "Enviar",
    login: "Iniciar sesion",
    signup: "Crear cuenta",
    logout: "Cerrar sesion",
    checking_auth: "Verificando sesion...",
    signed_in: "Con sesion iniciada",
    language: "Idioma",
    footer: "Wake · Edicion hackathon · Votacion anonima · Envio verificado",
  },
  fr: {
    issues: "Problemes",
    suggestions: "Suggestions",
    legislation: "Legislation",
    dashboard: "Tableau de bord",
    submit: "Envoyer",
    login: "Connexion",
    signup: "Inscription",
    logout: "Deconnexion",
    checking_auth: "Verification du compte...",
    signed_in: "Connecte",
    language: "Langue",
    footer: "Wake · Edition hackathon · Vote anonyme · Soumissions verifiees",
  },
  de: {
    issues: "Probleme",
    suggestions: "Vorschlage",
    legislation: "Gesetzgebung",
    dashboard: "Dashboard",
    submit: "Senden",
    login: "Anmelden",
    signup: "Registrieren",
    logout: "Abmelden",
    checking_auth: "Anmeldung wird gepruft...",
    signed_in: "Angemeldet",
    language: "Sprache",
    footer: "Wake · Hackathon Edition · Anonyme Abstimmung · Verifizierte Einreichungen",
  },
  pt: {
    issues: "Problemas",
    suggestions: "Sugestoes",
    legislation: "Legislacao",
    dashboard: "Painel",
    submit: "Enviar",
    login: "Entrar",
    signup: "Cadastrar",
    logout: "Sair",
    checking_auth: "Verificando sessao...",
    signed_in: "Conectado",
    language: "Idioma",
    footer: "Wake · Edicao hackathon · Votacao anonima · Envios verificados",
  },
  zh: {
    issues: "议题",
    suggestions: "建议",
    legislation: "法规",
    dashboard: "仪表盘",
    submit: "提交",
    login: "登录",
    signup: "注册",
    logout: "退出",
    checking_auth: "检查登录状态...",
    signed_in: "已登录",
    language: "语言",
    footer: "Wake · 黑客松版 · 匿名投票 · 已验证提交",
  },
};

export function normalizeSiteLocale(value: string | null | undefined): SiteLocale {
  const code = (value ?? "").trim().toLowerCase();
  const match = SITE_LANGUAGES.find((entry) => entry.code === code);
  return match ? match.code : "en";
}

export function getSiteMessages(locale: SiteLocale): Messages {
  return MESSAGES[locale] ?? MESSAGES.en;
}

