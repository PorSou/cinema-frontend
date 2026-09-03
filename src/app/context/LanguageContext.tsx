"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type Language = "en" | "km" | "zh";

type TranslationValue = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => TranslationValue;
}

const translations: Record<Language, Record<string, string>> = {
  en: {

    // =========================
    // Confirm Dialog
    // =========================
    "confirmDialog.cancel": "Cancel",

    "confirmDialog.hardDelete.title": "Delete Permanently",
    "confirmDialog.hardDelete.button": "Delete",
    "confirmDialog.hardDelete.message":
      'Are you sure you want to permanently delete "{name}"? This action cannot be undone.',

    "confirmDialog.restore.title": "Restore Account",
    "confirmDialog.restore.button": "Restore",
    "confirmDialog.restore.message":
      'Restore "{name}" back to active status?',

    "confirmDialog.softDelete.title": "Move to Trash",
    "confirmDialog.softDelete.button": "Move to Trash",
    "confirmDialog.softDelete.message":
      'Move "{name}" to the trash bin? You can restore it anytime.',

    "confirmDialog.logout.title": "Sign Out",
    "confirmDialog.logout.button": "Sign Out",
    "confirmDialog.logout.message":
      'Are you sure you want to sign out of "{name}"?',


    // =========================
    // Common
    // =========================
    "common.loading": "Loading...",
    "common.email": "Email Address",
    "common.password": "Password",
    "common.phone": "Phone Number",
    "common.fullName": "Full Name",
    "common.backToSignIn": "Back to Sign In",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.submit": "Submit",
    "common.required": "This field is required.",

    // =========================
    // Navbar
    // =========================
    "nav.home": "Home",
    "nav.movies": "Movies",
    "nav.showtimes": "Showtimes",
    "nav.cinemas": "Cinemas",
    "nav.myBookings": "My Bookings",
    "nav.login": "Sign In",
    "nav.register": "Create Account",
    "nav.logout": "Sign Out",
    "nav.profile": "Profile",
    "nav.admin": "Admin Dashboard",
    "nav.language": "Language",
    "nav.menu": "Menu",

    // =========================
    // Login
    // =========================
    "login.title": "Welcome Back",
    "login.subtitle": "Sign in to manage your tickets and reservations",
    "login.email": "Email Address",
    "login.emailPlaceholder": "name@example.com",
    "login.password": "Password",
    "login.passwordPlaceholder": "••••••••",
    "login.forgotPassword": "Forgot Password?",
    "login.signIn": "Sign In",
    "login.signingIn": "Signing In...",
    "login.noAccount": "Don't have an account?",
    "login.createAccount": "Create account",

    "login.emailRequired": "Email is required.",
    "login.emailInvalid": "Please enter a valid email address.",
    "login.passwordRequired": "Password is required.",
    "login.passwordMin": "Password must be at least 6 characters.",
    "login.invalidCredentials": "Invalid email or password.",
    "login.loginFailed": "Login failed. Please try again.",

    "login.lockedTitle": "Account Temporarily Locked",
    "login.lockedDescription":
      "Too many incorrect attempts. Please wait {time} before trying again.",
    "login.tooManyAttempts":
      "Too many failed attempts. Login is locked for {minutes} minutes.",
    "login.attemptsRemaining":
      "{count} attempt{plural} remaining",

    // =========================
    // Register
    // =========================
    "register.title": "Create Account",
    "register.subtitle":
      "Join CINEMAX for fast bookings and digital tickets",
    "register.fullName": "Full Name",
    "register.fullNamePlaceholder": "John Doe",
    "register.email": "Email Address",
    "register.emailPlaceholder": "name@example.com",
    "register.phone": "Phone Number",
    "register.phonePlaceholder": "012 345 678",
    "register.password": "Password",
    "register.passwordPlaceholder": "••••••••",
    "register.signUp": "Sign Up",
    "register.creating": "Creating Account...",
    "register.haveAccount": "Already have an account?",
    "register.signIn": "Sign In",

    "register.fullNameRequired": "Full name is required.",
    "register.fullNameMin": "Name must be at least 2 characters.",
    "register.emailRequired": "Email address is required.",
    "register.emailInvalid": "Please enter a valid email address.",
    "register.phoneRequired": "Phone number is required.",
    "register.phoneInvalid": "Please enter a valid phone number.",
    "register.passwordRequired": "Password is required.",
    "register.passwordMin": "Password must be at least 6 characters.",
    "register.failed": "Registration failed. Please try again.",

    // =========================
    // Forgot Password
    // =========================
    "forgot.title": "Forgot Password",
    "forgot.subtitle":
      "Enter your email and we'll send you a recovery code",
    "forgot.email": "Registered Email",
    "forgot.emailPlaceholder": "name@example.com",
    "forgot.sendCode": "Send Reset Code",
    "forgot.sending": "Sending...",
    "forgot.failed":
      "Failed to request password reset. Check your email.",
    "forgot.back": "Back to Sign In",

    // =========================
    // Reset Password
    // =========================
    "reset.title": "Reset Password",
    "reset.subtitle":
      "Enter the code sent to {email} and your new password",
    "reset.code": "6-Digit Reset Code",
    "reset.codePlaceholder": "123456",
    "reset.newPassword": "New Password",
    "reset.passwordPlaceholder": "••••••••",
    "reset.update": "Update Password",
    "reset.updating": "Updating...",
    "reset.success":
      "Password reset successful! Redirecting to login...",
    "reset.failed":
      "Failed to reset password. Verify the code.",
    "reset.invalidEmail": "Invalid or missing email address.",

    // =========================
    // Verify OTP
    // =========================
    "verify.title": "Verify Account",
    "verify.subtitle":
      "Enter the 6-digit code sent to {email}",
    "verify.code": "Verification Code",
    "verify.codePlaceholder": "123456",
    "verify.button": "Verify & Sign In",
    "verify.verifying": "Verifying...",
    "verify.didNotReceive": "Didn't receive the code?",
    "verify.resendIn": "Resend in {seconds}s",
    "verify.resend": "Resend Code",
    "verify.resending": "Resending...",
    "verify.success": "A new code has been sent to your email.",
    "verify.invalid": "Invalid or expired OTP code.",
    "verify.resendFailed": "Failed to resend code.",

    // =========================
    // Validation
    // =========================
    "validation.codeRequired": "Verification code is required.",
    "validation.codeInvalid": "Please enter a valid 6-digit code.",
    "validation.passwordMin": "Password must be at least 6 characters.",
  },

  km: {

    // =========================
    // Confirm Dialog
    // =========================
    "confirmDialog.cancel": "បោះបង់",

    "confirmDialog.hardDelete.title": "លុបជាអចិន្ត្រៃយ៍",
    "confirmDialog.hardDelete.button": "លុប",
    "confirmDialog.hardDelete.message":
      'តើអ្នកប្រាកដថាចង់លុប "{name}" ជាអចិន្ត្រៃយ៍មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។',

    "confirmDialog.restore.title": "ស្តារគណនីឡើងវិញ",
    "confirmDialog.restore.button": "ស្តារ",
    "confirmDialog.restore.message":
      'តើអ្នកចង់ស្តារ "{name}" ឱ្យត្រឡប់ទៅជាស្ថានភាពសកម្មវិញមែនទេ?',

    "confirmDialog.softDelete.title": "ផ្លាស់ទីទៅធុងសំរាម",
    "confirmDialog.softDelete.button": "ផ្លាស់ទីទៅធុងសំរាម",
    "confirmDialog.softDelete.message":
      'តើអ្នកចង់ផ្លាស់ទី "{name}" ទៅធុងសំរាមមែនទេ? អ្នកអាចស្តារវាឡើងវិញបានគ្រប់ពេល។',

    "confirmDialog.logout.title": "ចាកចេញ",
    "confirmDialog.logout.button": "ចាកចេញ",
    "confirmDialog.logout.message":
      'តើអ្នកប្រាកដថាចង់ចាកចេញពីគណនី "{name}" មែនទេ?',


    // =========================
    // Common
    // =========================
    "common.loading": "កំពុងផ្ទុក...",
    "common.email": "អាសយដ្ឋានអ៊ីមែល",
    "common.password": "ពាក្យសម្ងាត់",
    "common.phone": "លេខទូរស័ព្ទ",
    "common.fullName": "ឈ្មោះពេញ",
    "common.backToSignIn": "ត្រឡប់ទៅចូលគណនី",
    "common.cancel": "បោះបង់",
    "common.confirm": "បញ្ជាក់",
    "common.submit": "បញ្ជូន",
    "common.required": "តម្រូវឱ្យបំពេញ។",

    // Navbar
    "nav.home": "ទំព័រដើម",
    "nav.movies": "ភាពយន្ត",
    "nav.showtimes": "ម៉ោងបញ្ចាំង",
    "nav.cinemas": "រោងកុន",
    "nav.myBookings": "ការកក់របស់ខ្ញុំ",
    "nav.login": "ចូលគណនី",
    "nav.register": "បង្កើតគណនី",
    "nav.logout": "ចាកចេញ",
    "nav.profile": "ប្រវត្តិរូប",
    "nav.admin": "ផ្ទាំងគ្រប់គ្រង",
    "nav.language": "ភាសា",
    "nav.menu": "ម៉ឺនុយ",

    // Login
    "login.title": "សូមស្វាគមន៍ត្រឡប់មកវិញ",
    "login.subtitle":
      "ចូលគណនីដើម្បីគ្រប់គ្រងសំបុត្រ និងការកក់របស់អ្នក",
    "login.email": "អាសយដ្ឋានអ៊ីមែល",
    "login.emailPlaceholder": "name@example.com",
    "login.password": "ពាក្យសម្ងាត់",
    "login.passwordPlaceholder": "••••••••",
    "login.forgotPassword": "ភ្លេចពាក្យសម្ងាត់?",
    "login.signIn": "ចូលគណនី",
    "login.signingIn": "កំពុងចូលគណនី...",
    "login.noAccount": "មិនទាន់មានគណនីមែនទេ?",
    "login.createAccount": "បង្កើតគណនី",

    "login.emailRequired": "តម្រូវឱ្យបញ្ចូលអ៊ីមែល។",
    "login.emailInvalid": "សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវ។",
    "login.passwordRequired": "តម្រូវឱ្យបញ្ចូលពាក្យសម្ងាត់។",
    "login.passwordMin": "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។",
    "login.invalidCredentials": "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។",
    "login.loginFailed": "ការចូលគណនីបរាជ័យ។ សូមព្យាយាមម្តងទៀត។",

    "login.lockedTitle": "គណនីត្រូវបានចាក់សោជាបណ្តោះអាសន្ន",
    "login.lockedDescription":
      "ការបញ្ចូលមិនត្រឹមត្រូវច្រើនដង។ សូមរង់ចាំ {time} មុនពេលព្យាយាមម្តងទៀត។",
    "login.tooManyAttempts":
      "ព្យាយាមខុសច្រើនដង។ ការចូលគណនីត្រូវបានចាក់សោរយៈពេល {minutes} នាទី។",
    "login.attemptsRemaining":
      "នៅសល់ {count} ដងទៀត",

    // Register
    "register.title": "បង្កើតគណនី",
    "register.subtitle":
      "ចូលរួមជាមួយ CINEMAX ដើម្បីកក់សំបុត្របានលឿន និងទទួលបានសំបុត្រឌីជីថល",
    "register.fullName": "ឈ្មោះពេញ",
    "register.fullNamePlaceholder": "ឧ. John Doe",
    "register.email": "អាសយដ្ឋានអ៊ីមែល",
    "register.emailPlaceholder": "name@example.com",
    "register.phone": "លេខទូរស័ព្ទ",
    "register.phonePlaceholder": "012 345 678",
    "register.password": "ពាក្យសម្ងាត់",
    "register.passwordPlaceholder": "••••••••",
    "register.signUp": "ចុះឈ្មោះ",
    "register.creating": "កំពុងបង្កើតគណនី...",
    "register.haveAccount": "មានគណនីរួចហើយ?",
    "register.signIn": "ចូលគណនី",

    "register.fullNameRequired": "តម្រូវឱ្យបញ្ចូលឈ្មោះពេញ។",
    "register.fullNameMin": "ឈ្មោះត្រូវមានយ៉ាងហោចណាស់ 2 តួអក្សរ។",
    "register.emailRequired": "តម្រូវឱ្យបញ្ចូលអាសយដ្ឋានអ៊ីមែល។",
    "register.emailInvalid": "សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវ។",
    "register.phoneRequired": "តម្រូវឱ្យបញ្ចូលលេខទូរស័ព្ទ។",
    "register.phoneInvalid": "សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ។",
    "register.passwordRequired": "តម្រូវឱ្យបញ្ចូលពាក្យសម្ងាត់។",
    "register.passwordMin": "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។",
    "register.failed": "ការចុះឈ្មោះបរាជ័យ។ សូមព្យាយាមម្តងទៀត។",

    // Forgot
    "forgot.title": "ភ្លេចពាក្យសម្ងាត់",
    "forgot.subtitle":
      "បញ្ចូលអ៊ីមែលរបស់អ្នក ហើយយើងនឹងផ្ញើលេខកូដសម្រាប់សង្គ្រោះ",
    "forgot.email": "អ៊ីមែលដែលបានចុះឈ្មោះ",
    "forgot.emailPlaceholder": "name@example.com",
    "forgot.sendCode": "ផ្ញើលេខកូដកំណត់ឡើងវិញ",
    "forgot.sending": "កំពុងផ្ញើ...",
    "forgot.failed":
      "មិនអាចស្នើសុំកំណត់ពាក្យសម្ងាត់ឡើងវិញបានទេ។ សូមពិនិត្យអ៊ីមែលរបស់អ្នក។",
    "forgot.back": "ត្រឡប់ទៅចូលគណនី",

    // Reset
    "reset.title": "កំណត់ពាក្យសម្ងាត់ឡើងវិញ",
    "reset.subtitle":
      "បញ្ចូលលេខកូដដែលបានផ្ញើទៅ {email} និងពាក្យសម្ងាត់ថ្មីរបស់អ្នក",
    "reset.code": "លេខកូដ 6 ខ្ទង់",
    "reset.codePlaceholder": "123456",
    "reset.newPassword": "ពាក្យសម្ងាត់ថ្មី",
    "reset.passwordPlaceholder": "••••••••",
    "reset.update": "ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់",
    "reset.updating": "កំពុងធ្វើបច្ចុប្បន្នភាព...",
    "reset.success":
      "កំណត់ពាក្យសម្ងាត់ឡើងវិញជោគជ័យ! កំពុងបញ្ជូនទៅទំព័រចូលគណនី...",
    "reset.failed":
      "មិនអាចកំណត់ពាក្យសម្ងាត់ឡើងវិញបានទេ។ សូមពិនិត្យលេខកូដ។",
    "reset.invalidEmail": "អ៊ីមែលមិនត្រឹមត្រូវ ឬមិនមាន។",

    // Verify
    "verify.title": "ផ្ទៀងផ្ទាត់គណនី",
    "verify.subtitle":
      "បញ្ចូលលេខកូដ 6 ខ្ទង់ដែលបានផ្ញើទៅ {email}",
    "verify.code": "លេខកូដផ្ទៀងផ្ទាត់",
    "verify.codePlaceholder": "123456",
    "verify.button": "ផ្ទៀងផ្ទាត់ និងចូលគណនី",
    "verify.verifying": "កំពុងផ្ទៀងផ្ទាត់...",
    "verify.didNotReceive": "មិនទទួលបានលេខកូដមែនទេ?",
    "verify.resendIn": "ផ្ញើម្តងទៀតក្នុង {seconds} វិនាទី",
    "verify.resend": "ផ្ញើលេខកូដម្តងទៀត",
    "verify.resending": "កំពុងផ្ញើ...",
    "verify.success": "លេខកូដថ្មីត្រូវបានផ្ញើទៅអ៊ីមែលរបស់អ្នក។",
    "verify.invalid": "លេខកូដមិនត្រឹមត្រូវ ឬផុតកំណត់។",
    "verify.resendFailed": "មិនអាចផ្ញើលេខកូដម្តងទៀតបានទេ។",

    "validation.codeRequired": "តម្រូវឱ្យបញ្ចូលលេខកូដ។",
    "validation.codeInvalid": "សូមបញ្ចូលលេខកូដ 6 ខ្ទង់ត្រឹមត្រូវ។",
    "validation.passwordMin": "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។",
  },

  zh: {


    // =========================
    // Confirm Dialog
    // =========================
    "confirmDialog.cancel": "取消",

    "confirmDialog.hardDelete.title": "永久删除",
    "confirmDialog.hardDelete.button": "删除",
    "confirmDialog.hardDelete.message":
      '您确定要永久删除“{name}”吗？此操作无法撤销。',

    "confirmDialog.restore.title": "恢复账户",
    "confirmDialog.restore.button": "恢复",
    "confirmDialog.restore.message":
      '确定要将“{name}”恢复为活跃状态吗？',

    "confirmDialog.softDelete.title": "移至回收站",
    "confirmDialog.softDelete.button": "移至回收站",
    "confirmDialog.softDelete.message":
      '确定要将“{name}”移至回收站吗？您可以随时恢复。',

    "confirmDialog.logout.title": "退出登录",
    "confirmDialog.logout.button": "退出登录",
    "confirmDialog.logout.message":
      '确定要退出“{name}”的账户吗？',


    // =========================
    // Common
    // =========================
    "common.loading": "加载中...",
    "common.email": "电子邮箱",
    "common.password": "密码",
    "common.phone": "电话号码",
    "common.fullName": "姓名",
    "common.backToSignIn": "返回登录",
    "common.cancel": "取消",
    "common.confirm": "确认",
    "common.submit": "提交",
    "common.required": "此字段为必填项。",

    // Navbar
    "nav.home": "首页",
    "nav.movies": "电影",
    "nav.showtimes": "放映时间",
    "nav.cinemas": "电影院",
    "nav.myBookings": "我的订单",
    "nav.login": "登录",
    "nav.register": "创建账户",
    "nav.logout": "退出登录",
    "nav.profile": "个人资料",
    "nav.admin": "管理后台",
    "nav.language": "语言",
    "nav.menu": "菜单",

    // Login
    "login.title": "欢迎回来",
    "login.subtitle": "登录以管理您的电影票和预订",
    "login.email": "电子邮箱",
    "login.emailPlaceholder": "name@example.com",
    "login.password": "密码",
    "login.passwordPlaceholder": "••••••••",
    "login.forgotPassword": "忘记密码？",
    "login.signIn": "登录",
    "login.signingIn": "正在登录...",
    "login.noAccount": "还没有账户？",
    "login.createAccount": "创建账户",

    "login.emailRequired": "请输入电子邮箱。",
    "login.emailInvalid": "请输入有效的电子邮箱地址。",
    "login.passwordRequired": "请输入密码。",
    "login.passwordMin": "密码至少需要6个字符。",
    "login.invalidCredentials": "电子邮箱或密码错误。",
    "login.loginFailed": "登录失败，请重试。",

    "login.lockedTitle": "账户暂时锁定",
    "login.lockedDescription":
      "错误尝试次数过多，请等待 {time} 后再试。",
    "login.tooManyAttempts":
      "失败次数过多，登录已锁定 {minutes} 分钟。",
    "login.attemptsRemaining": "还剩 {count} 次尝试",

    // Register
    "register.title": "创建账户",
    "register.subtitle":
      "加入 CINEMAX，快速预订电影票并获取数字票",
    "register.fullName": "姓名",
    "register.fullNamePlaceholder": "例如：John Doe",
    "register.email": "电子邮箱",
    "register.emailPlaceholder": "name@example.com",
    "register.phone": "电话号码",
    "register.phonePlaceholder": "012 345 678",
    "register.password": "密码",
    "register.passwordPlaceholder": "••••••••",
    "register.signUp": "注册",
    "register.creating": "正在创建账户...",
    "register.haveAccount": "已经有账户？",
    "register.signIn": "登录",

    "register.fullNameRequired": "请输入姓名。",
    "register.fullNameMin": "姓名至少需要2个字符。",
    "register.emailRequired": "请输入电子邮箱。",
    "register.emailInvalid": "请输入有效的电子邮箱地址。",
    "register.phoneRequired": "请输入电话号码。",
    "register.phoneInvalid": "请输入有效的电话号码。",
    "register.passwordRequired": "请输入密码。",
    "register.passwordMin": "密码至少需要6个字符。",
    "register.failed": "注册失败，请重试。",

    // Forgot
    "forgot.title": "忘记密码",
    "forgot.subtitle": "输入您的电子邮箱，我们会发送密码恢复验证码",
    "forgot.email": "注册邮箱",
    "forgot.emailPlaceholder": "name@example.com",
    "forgot.sendCode": "发送重置验证码",
    "forgot.sending": "正在发送...",
    "forgot.failed": "无法请求密码重置，请检查您的邮箱。",
    "forgot.back": "返回登录",

    // Reset
    "reset.title": "重置密码",
    "reset.subtitle":
      "输入发送到 {email} 的验证码以及您的新密码",
    "reset.code": "6位重置验证码",
    "reset.codePlaceholder": "123456",
    "reset.newPassword": "新密码",
    "reset.passwordPlaceholder": "••••••••",
    "reset.update": "更新密码",
    "reset.updating": "正在更新...",
    "reset.success": "密码重置成功！正在跳转到登录页面...",
    "reset.failed": "密码重置失败，请检查验证码。",
    "reset.invalidEmail": "电子邮箱无效或缺失。",

    // Verify
    "verify.title": "验证账户",
    "verify.subtitle": "输入发送到 {email} 的6位验证码",
    "verify.code": "验证码",
    "verify.codePlaceholder": "123456",
    "verify.button": "验证并登录",
    "verify.verifying": "正在验证...",
    "verify.didNotReceive": "没有收到验证码？",
    "verify.resendIn": "{seconds}秒后重新发送",
    "verify.resend": "重新发送验证码",
    "verify.resending": "正在重新发送...",
    "verify.success": "新的验证码已发送到您的邮箱。",
    "verify.invalid": "验证码无效或已过期。",
    "verify.resendFailed": "无法重新发送验证码。",

    "validation.codeRequired": "请输入验证码。",
    "validation.codeInvalid": "请输入有效的6位验证码。",
    "validation.passwordMin": "密码至少需要6个字符。",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cinemax_language") as Language | null;
      if (saved === "en" || saved === "km" || saved === "zh") {
        setLanguageState(saved);
      }
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("cinemax_language", lang);
    } catch {}
    document.documentElement.lang = lang;
  };

  const t = (key: string) => {
    const value = translations[language]?.[key];
    if (value) return value;
    return translations.en[key] || key;
  };

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}
