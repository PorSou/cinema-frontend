"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type Theme = "dark" | "light" | "sepia" | "sunset" | "ocean" | "forest";
export type Language = "en" | "km" | "zh";

/* ============================================================
   TRANSLATIONS
============================================================ */

const translations = {
  en: {
    // Common
    loading: "Loading...",
    email: "Email Address",
    password: "Password",
    phone: "Phone Number",
    fullName: "Full Name",
    cancel: "Cancel",
    confirm: "Confirm",
    submit: "Submit",
    required: "This field is required.",

    // Navigation
    dashboard: "Dashboard",
    movies: "Movies",
    cinemas: "Cinemas",
    halls: "Halls & Auditoriums",
    seats: "Auditorium Seats",
    showtimes: "Showtimes",
    bookings: "Bookings",
    payments: "Payments",
    scanner: "Admission Scanner",
    users: "Users & Staff",
    analytics: "Analytics & Reports",
    settings: "System Settings",

    profile: "My Profile",
    save: "Save Changes",
    logout: "Logout",

    bookNow: "Book Now",
    search: "Search",

    moviesAndShowtimes: "Movies & Showtimes",
    cinemasAndLocations: "Cinemas & Locations",
    myBookings: "My Bookings",

    signIn: "Sign In",
    register: "Register",
    signOut: "Sign Out",
    adminConsole: "Admin Console",

    settingsTitle: "Settings",
    navigation: "Navigation",
    account: "Account",
    language: "Language",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",

    // Navbar-specific (moved in from Navbar.tsx)
    navDark: "Dark",
    navLight: "Light",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    logoutTitle: "Sign Out",
    logoutTargetFallback: "your account",

    // Movies
    cinematicReleases: "Cinematic Releases",
    exploreReleases:
      "Explore current releases or browse upcoming blockbusters.",

    searchMovies: "Search movies...",
    nowShowing: "Now Showing",
    comingSoon: "Coming Soon",
    genres: "Genres",
    category: "Category:",
    all: "All",

    loadingMovies: "Loading movies...",
    couldNotLoadMovies: "Could not load movies",
    movieServiceError: "The movie service did not respond.",
    tryAgain: "Try Again",

    noMoviesFound: "No movies found",
    noMoviesDescription:
      "Check back soon for new additions in this category.",

    details: "Details",
    watchTrailer: "WATCH TRAILER",
    buyTicket: "BUY TICKET",

    // Home
    whyBook: "Why Book With CineMax",
    whyBookDescription:
      "Everything you need for a smooth night at the movies, from booking to the big screen.",

    instantETickets: "Instant E-Tickets",
    instantETicketsDescription:
      "Book in seconds and skip the box office line — just show your phone at the door.",

    dolbyAtmos: "Dolby Atmos Sound",
    dolbyAtmosDescription:
      "Immersive, room-filling audio across every screen in the CineMax network.",

    bestSeat: "Best Seat Guarantee",
    bestSeatDescription:
      "Real-time seat maps so you always know exactly what you're picking before you pay.",

    neverMiss: "Never Miss a Premiere",
    neverMissDescription:
      "Get notified about new releases, presale tickets, and exclusive promotions.",

    subscribe: "Subscribe",
    subscribed: "You're on the list — thanks for subscribing!",

    newsletterSuccess:
      "Thanks! You're subscribed to CineMax updates.",

    imdbRating: "IMDb Rating",
    rottenRating: "Rotten Rating",

    customerSupport: "Customer Support",
    quickNavigation: "Quick Navigation",
    secureTicketing: "Secure Ticketing",
    secureCheckout: "100% Secure Checkout",

    secureCheckoutDescription:
      "All seat bookings and payment gateways are fully encrypted and verified.",

    yourUltimateDestination:
      "Your ultimate destination for premium cinema blockbusters, immersive Dolby Atmos sound, and instant seat bookings.",

    nowShowingFooter: "Now Showing",
    comingSoonFooter: "Coming Soon",
    vipSuites: "VIP & Couple Suites",

    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    cookieSettings: "Cookie Settings",

    allRightsReserved:
      "© 2026 Cinemax Booking System. All rights reserved.",

    phnomPenhCambodia: "Phnom Penh, Cambodia",

    yourUltimateMovieExperience:
      "Your ultimate movie experience.",

    // Login
    "login.title": "Welcome Back",
    "login.subtitle":
      "Sign in to manage your tickets and reservations",
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
    "login.emailInvalid":
      "Please enter a valid email address.",
    "login.passwordRequired": "Password is required.",
    "login.passwordMin":
      "Password must be at least 6 characters.",
    "login.invalidCredentials":
      "Invalid email or password.",
    "login.loginFailed":
      "Login failed. Please try again.",

    "login.lockedTitle":
      "Account Temporarily Locked",
    "login.lockedDescription":
      "Too many incorrect attempts. Please wait {time} before trying again.",
    "login.tooManyAttempts":
      "Too many failed attempts. Login is locked for {minutes} minutes.",
    "login.attemptsRemaining":
      "{count} attempt{plural} remaining",

    // Register
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
    "register.haveAccount":
      "Already have an account?",
    "register.signIn": "Sign In",

    "register.fullNameRequired":
      "Full name is required.",
    "register.fullNameMin":
      "Name must be at least 2 characters.",
    "register.emailRequired":
      "Email address is required.",
    "register.emailInvalid":
      "Please enter a valid email address.",
    "register.phoneRequired":
      "Phone number is required.",
    "register.phoneInvalid":
      "Please enter a valid phone number.",
    "register.passwordRequired":
      "Password is required.",
    "register.passwordMin":
      "Password must be at least 6 characters.",
    "register.failed":
      "Registration failed. Please try again.",

    // Forgot password
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

    // Reset password
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
    "reset.invalidEmail":
      "Invalid or missing email address.",

    // Verify
    "verify.title": "Verify Account",
    "verify.subtitle":
      "Enter the 6-digit code sent to {email}",
    "verify.code": "Verification Code",
    "verify.codePlaceholder": "123456",
    "verify.button": "Verify & Sign In",
    "verify.verifying": "Verifying...",
    "verify.didNotReceive":
      "Didn't receive the code?",
    "verify.resendIn":
      "Resend in {seconds}s",
    "verify.resend": "Resend Code",
    "verify.resending": "Resending...",
    "verify.success":
      "A new code has been sent to your email.",
    "verify.invalid":
      "Invalid or expired OTP code.",
    "verify.resendFailed":
      "Failed to resend code.",

    // Validation
    "validation.codeRequired":
      "Verification code is required.",
    "validation.codeInvalid":
      "Please enter a valid 6-digit code.",
    "validation.passwordMin":
      "Password must be at least 6 characters.",
  },

  km: {
    loading: "កំពុងផ្ទុក...",
    email: "អាសយដ្ឋានអ៊ីមែល",
    password: "ពាក្យសម្ងាត់",
    phone: "លេខទូរស័ព្ទ",
    fullName: "ឈ្មោះពេញ",
    cancel: "បោះបង់",
    confirm: "បញ្ជាក់",
    submit: "បញ្ជូន",
    required: "តម្រូវឱ្យបំពេញ។",

    dashboard: "ផ្ទាំងគ្រប់គ្រង",
    movies: "ភាពយន្ត",
    cinemas: "រោងកុន",
    halls: "សាលភាពយន្ត",
    seats: "កៅអី",
    showtimes: "កាលវិភាគបញ្ចាំង",
    bookings: "ការកក់សំបុត្រ",
    payments: "ការទូទាត់",
    scanner: "ស្កេនចូលរោង",
    users: "អ្នកប្រើប្រាស់ និងបុគ្គលិក",
    analytics: "វិភាគ និងរបាយការណ៍",
    settings: "ការកំណត់ប្រព័ន្ធ",

    profile: "ប្រវត្តិរូបរបស់ខ្ញុំ",
    save: "រក្សាទុកការផ្លាស់ប្តូរ",
    logout: "ចាកចេញ",

    bookNow: "កក់ឥឡូវនេះ",
    search: "ស្វែងរក",

    moviesAndShowtimes: "ភាពយន្ត និងម៉ោងបញ្ចាំង",
    cinemasAndLocations: "រោងកុន និងទីតាំង",
    myBookings: "ការកក់របស់ខ្ញុំ",

    signIn: "ចូលគណនី",
    register: "ចុះឈ្មោះ",
    signOut: "ចាកចេញ",
    adminConsole: "ផ្ទាំងគ្រប់គ្រងអ្នកគ្រប់គ្រង",

    settingsTitle: "ការកំណត់",
    navigation: "ការរុករក",
    account: "គណនី",
    language: "ភាសា",
    lightMode: "មុខងារពន្លឺ",
    darkMode: "មុខងារងងឹត",

    navDark: "ងងឹត",
    navLight: "ភ្លឺ",
    openMenu: "បើកម៉ឺនុយ",
    closeMenu: "បិទម៉ឺនុយ",
    logoutTitle: "ចាកចេញ",
    logoutTargetFallback: "គណនីរបស់អ្នក",

    cinematicReleases: "ភាពយន្តដែលកំពុងចេញផ្សាយ",
    exploreReleases:
      "ស្វែងរកភាពយន្តដែលកំពុងចាក់បញ្ចាំង ឬភាពយន្តដែលនឹងចេញផ្សាយក្នុងពេលខាងមុខ។",

    searchMovies: "ស្វែងរកភាពយន្ត...",
    nowShowing: "កំពុងចាក់បញ្ចាំង",
    comingSoon: "នឹងចាក់បញ្ចាំងឆាប់ៗ",
    genres: "ប្រភេទ",
    category: "ប្រភេទ៖",
    all: "ទាំងអស់",

    loadingMovies: "កំពុងផ្ទុកភាពយន្ត...",
    couldNotLoadMovies: "មិនអាចផ្ទុកភាពយន្តបាន",
    movieServiceError: "សេវាកម្មភាពយន្តមិនបានឆ្លើយតប។",
    tryAgain: "ព្យាយាមម្តងទៀត",

    noMoviesFound: "រកមិនឃើញភាពយន្ត",
    noMoviesDescription:
      "សូមពិនិត្យមើលម្តងទៀតនៅពេលក្រោយសម្រាប់ភាពយន្តថ្មីៗក្នុងប្រភេទនេះ។",

    details: "ព័ត៌មានលម្អិត",
    watchTrailer: "មើលឈុតខ្លី",
    buyTicket: "ទិញសំបុត្រ",

    whyBook: "ហេតុអ្វីកក់សំបុត្រជាមួយ CineMax?",
    whyBookDescription:
      "អ្វីៗដែលអ្នកត្រូវការសម្រាប់បទពិសោធន៍មើលភាពយន្តដ៏រលូន ចាប់ពីការកក់រហូតដល់អេក្រង់ធំ។",

    instantETickets: "សំបុត្រអេឡិចត្រូនិកភ្លាមៗ",
    instantETicketsDescription:
      "កក់ក្នុងរយៈពេលប៉ុន្មានវិនាទី ហើយរំលងជួរទិញសំបុត្រ — គ្រាន់តែបង្ហាញទូរស័ព្ទរបស់អ្នកនៅច្រកចូល។",

    dolbyAtmos: "សំឡេង Dolby Atmos",
    dolbyAtmosDescription:
      "បទពិសោធន៍សំឡេងដ៏អស្ចារ្យ និងពេញបន្ទប់នៅគ្រប់សាលភាពយន្តរបស់ CineMax។",

    bestSeat: "ធានាកៅអីល្អបំផុត",
    bestSeatDescription:
      "ផែនទីកៅអីបែប Real-time ដើម្បីឱ្យអ្នកដឹងច្បាស់ថាអ្នកកំពុងជ្រើសរើសកៅអីណាមុនពេលបង់ប្រាក់។",

    neverMiss: "កុំខកខានការចាក់បញ្ចាំងថ្មី",
    neverMissDescription:
      "ទទួលបានព័ត៌មានអំពីភាពយន្តថ្មីៗ សំបុត្រលក់មុន និងប្រូម៉ូសិនពិសេស។",

    subscribe: "ជាវ",
    subscribed:
      "អ្នកបានចុះឈ្មោះរួចហើយ — អរគុណសម្រាប់ការជាវ!",

    newsletterSuccess:
      "អរគុណ! អ្នកបានជាវព័ត៌មានថ្មីៗពី CineMax។",

    imdbRating: "ពិន្ទុ IMDb",
    rottenRating: "ពិន្ទុ Rotten",

    customerSupport: "ជំនួយអតិថិជន",
    quickNavigation: "ការរុករករហ័ស",
    secureTicketing: "ការកក់សំបុត្រដែលមានសុវត្ថិភាព",
    secureCheckout: "ការទូទាត់មានសុវត្ថិភាព 100%",

    secureCheckoutDescription:
      "ការកក់កៅអី និងប្រព័ន្ធទូទាត់ទាំងអស់ត្រូវបានអ៊ិនគ្រីប និងផ្ទៀងផ្ទាត់យ៉ាងពេញលេញ។",

    yourUltimateDestination:
      "គោលដៅចុងក្រោយរបស់អ្នកសម្រាប់ភាពយន្តល្បីៗ សំឡេង Dolby Atmos ដ៏អស្ចារ្យ និងការកក់កៅអីភ្លាមៗ។",

    nowShowingFooter: "កំពុងចាក់បញ្ចាំង",
    comingSoonFooter: "នឹងចាក់បញ្ចាំងឆាប់ៗ",
    vipSuites: "បន្ទប់ VIP និងគូស្នេហ៍",

    privacyPolicy: "គោលការណ៍ឯកជនភាព",
    termsOfService: "លក្ខខណ្ឌប្រើប្រាស់",
    cookieSettings: "ការកំណត់ Cookie",

    allRightsReserved:
      "© 2026 ប្រព័ន្ធកក់សំបុត្រ CineMax។ រក្សាសិទ្ធិគ្រប់យ៉ាង។",

    phnomPenhCambodia: "ភ្នំពេញ ប្រទេសកម្ពុជា",

    yourUltimateMovieExperience:
      "បទពិសោធន៍មើលភាពយន្តដ៏អស្ចារ្យបំផុតរបស់អ្នក។",

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
    "login.emailInvalid":
      "សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវ។",
    "login.passwordRequired":
      "តម្រូវឱ្យបញ្ចូលពាក្យសម្ងាត់។",
    "login.passwordMin":
      "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។",
    "login.invalidCredentials":
      "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។",
    "login.loginFailed":
      "ការចូលគណនីបរាជ័យ។ សូមព្យាយាមម្តងទៀត។",

    "login.lockedTitle":
      "គណនីត្រូវបានចាក់សោជាបណ្តោះអាសន្ន",
    "login.lockedDescription":
      "ការបញ្ចូលមិនត្រឹមត្រូវច្រើនដង។ សូមរង់ចាំ {time} មុនពេលព្យាយាមម្តងទៀត។",
    "login.tooManyAttempts":
      "ព្យាយាមខុសច្រើនដង។ ការចូលគណនីត្រូវបានចាក់សោរយៈពេល {minutes} នាទី។",
    "login.attemptsRemaining":
      "នៅសល់ {count} ដងទៀត",

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

    "register.fullNameRequired":
      "តម្រូវឱ្យបញ្ចូលឈ្មោះពេញ។",
    "register.fullNameMin":
      "ឈ្មោះត្រូវមានយ៉ាងហោចណាស់ 2 តួអក្សរ។",
    "register.emailRequired":
      "តម្រូវឱ្យបញ្ចូលអាសយដ្ឋានអ៊ីមែល។",
    "register.emailInvalid":
      "សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវ។",
    "register.phoneRequired":
      "តម្រូវឱ្យបញ្ចូលលេខទូរស័ព្ទ។",
    "register.phoneInvalid":
      "សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ។",
    "register.passwordRequired":
      "តម្រូវឱ្យបញ្ចូលពាក្យសម្ងាត់។",
    "register.passwordMin":
      "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។",
    "register.failed":
      "ការចុះឈ្មោះបរាជ័យ។ សូមព្យាយាមម្តងទៀត។",

    "forgot.title": "ភ្លេចពាក្យសម្ងាត់",
    "forgot.subtitle":
      "បញ្ចូលអ៊ីមែលរបស់អ្នក ហើយយើងនឹងផ្ញើលេខកូដសម្រាប់សង្គ្រោះ",
    "forgot.email": "អ៊ីមែលដែលបានចុះឈ្មោះ",
    "forgot.emailPlaceholder": "name@example.com",
    "forgot.sendCode":
      "ផ្ញើលេខកូដកំណត់ឡើងវិញ",
    "forgot.sending": "កំពុងផ្ញើ...",
    "forgot.failed":
      "មិនអាចស្នើសុំកំណត់ពាក្យសម្ងាត់ឡើងវិញបានទេ។ សូមពិនិត្យអ៊ីមែលរបស់អ្នក។",
    "forgot.back": "ត្រឡប់ទៅចូលគណនី",

    "reset.title": "កំណត់ពាក្យសម្ងាត់ឡើងវិញ",
    "reset.subtitle":
      "បញ្ចូលលេខកូដដែលបានផ្ញើទៅ {email} និងពាក្យសម្ងាត់ថ្មីរបស់អ្នក",
    "reset.code": "លេខកូដ 6 ខ្ទង់",
    "reset.codePlaceholder": "123456",
    "reset.newPassword": "ពាក្យសម្ងាត់ថ្មី",
    "reset.passwordPlaceholder": "••••••••",
    "reset.update":
      "ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់",
    "reset.updating":
      "កំពុងធ្វើបច្ចុប្បន្នភាព...",
    "reset.success":
      "កំណត់ពាក្យសម្ងាត់ឡើងវិញជោគជ័យ! កំពុងបញ្ជូនទៅទំព័រចូលគណនី...",
    "reset.failed":
      "មិនអាចកំណត់ពាក្យសម្ងាត់ឡើងវិញបានទេ។ សូមពិនិត្យលេខកូដ។",
    "reset.invalidEmail":
      "អ៊ីមែលមិនត្រឹមត្រូវ ឬមិនមាន។",

    "verify.title": "ផ្ទៀងផ្ទាត់គណនី",
    "verify.subtitle":
      "បញ្ចូលលេខកូដ 6 ខ្ទង់ដែលបានផ្ញើទៅ {email}",
    "verify.code": "លេខកូដផ្ទៀងផ្ទាត់",
    "verify.codePlaceholder": "123456",
    "verify.button":
      "ផ្ទៀងផ្ទាត់ និងចូលគណនី",
    "verify.verifying": "កំពុងផ្ទៀងផ្ទាត់...",
    "verify.didNotReceive":
      "មិនទទួលបានលេខកូដមែនទេ?",
    "verify.resendIn":
      "ផ្ញើម្តងទៀតក្នុង {seconds} វិនាទី",
    "verify.resend":
      "ផ្ញើលេខកូដម្តងទៀត",
    "verify.resending": "កំពុងផ្ញើ...",
    "verify.success":
      "លេខកូដថ្មីត្រូវបានផ្ញើទៅអ៊ីមែលរបស់អ្នក។",
    "verify.invalid":
      "លេខកូដមិនត្រឹមត្រូវ ឬផុតកំណត់។",
    "verify.resendFailed":
      "មិនអាចផ្ញើលេខកូដម្តងទៀតបានទេ។",

    "validation.codeRequired":
      "តម្រូវឱ្យបញ្ចូលលេខកូដ។",
    "validation.codeInvalid":
      "សូមបញ្ចូលលេខកូដ 6 ខ្ទង់ត្រឹមត្រូវ។",
    "validation.passwordMin":
      "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។",
  },

  zh: {
    loading: "加载中...",
    email: "电子邮箱",
    password: "密码",
    phone: "电话号码",
    fullName: "姓名",
    cancel: "取消",
    confirm: "确认",
    submit: "提交",
    required: "此字段为必填项。",

    dashboard: "仪表板",
    movies: "电影",
    cinemas: "电影院",
    halls: "影厅",
    seats: "座位",
    showtimes: "放映时间",
    bookings: "预订",
    payments: "支付",
    scanner: "入场扫描",
    users: "用户与员工",
    analytics: "分析与报告",
    settings: "系统设置",

    profile: "我的资料",
    save: "保存更改",
    logout: "退出登录",

    bookNow: "立即预订",
    search: "搜索",

    moviesAndShowtimes: "电影与放映时间",
    cinemasAndLocations: "影院与地点",
    myBookings: "我的预订",

    signIn: "登录",
    register: "注册",
    signOut: "退出登录",
    adminConsole: "管理控制台",

    settingsTitle: "设置",
    navigation: "导航",
    account: "账户",
    language: "语言",
    lightMode: "浅色模式",
    darkMode: "深色模式",

    navDark: "深色",
    navLight: "浅色",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    logoutTitle: "退出登录",
    logoutTargetFallback: "您的账户",

    cinematicReleases: "电影上映",
    exploreReleases:
      "探索正在上映的电影或浏览即将上映的大片。",

    searchMovies: "搜索电影...",
    nowShowing: "正在上映",
    comingSoon: "即将上映",
    genres: "类型",
    category: "类别：",
    all: "全部",

    loadingMovies: "正在加载电影...",
    couldNotLoadMovies: "无法加载电影",
    movieServiceError: "电影服务没有响应。",
    tryAgain: "重试",

    noMoviesFound: "没有找到电影",
    noMoviesDescription:
      "请稍后再来查看此类别中的新电影。",

    details: "详情",
    watchTrailer: "观看预告片",
    buyTicket: "购买电影票",

    whyBook: "为什么选择 CineMax",
    whyBookDescription:
      "从购票到大屏幕，为您提供顺畅电影之夜所需的一切。",

    instantETickets: "即时电子票",
    instantETicketsDescription:
      "几秒钟即可完成预订，无需排队购票——入场时出示手机即可。",

    dolbyAtmos: "杜比全景声",
    dolbyAtmosDescription:
      "CineMax 所有影厅均提供沉浸式环绕音效体验。",

    bestSeat: "最佳座位保障",
    bestSeatDescription:
      "实时座位图，让您在付款前准确选择想要的座位。",

    neverMiss: "不要错过首映",
    neverMissDescription:
      "获取新电影上映、预售电影票和独家优惠信息。",

    subscribe: "订阅",
    subscribed:
      "您已成功订阅 — 感谢您的关注！",

    newsletterSuccess:
      "谢谢！您已成功订阅 CineMax 最新资讯。",

    imdbRating: "IMDb 评分",
    rottenRating: "烂番茄评分",

    customerSupport: "客户支持",
    quickNavigation: "快速导航",
    secureTicketing: "安全购票",
    secureCheckout: "100% 安全结账",

    secureCheckoutDescription:
      "所有座位预订和支付网关均经过加密和验证。",

    yourUltimateDestination:
      "CineMax 是您体验热门电影、沉浸式 Dolby Atmos 音效和即时座位预订的终极目的地。",

    nowShowingFooter: "正在上映",
    comingSoonFooter: "即将上映",
    vipSuites: "VIP 与情侣包厢",

    privacyPolicy: "隐私政策",
    termsOfService: "服务条款",
    cookieSettings: "Cookie 设置",

    allRightsReserved:
      "© 2026 CineMax 电影票务系统。保留所有权利。",

    phnomPenhCambodia: "柬埔寨金边",

    yourUltimateMovieExperience:
      "您的终极电影体验。",

    "login.title": "欢迎回来",
    "login.subtitle":
      "登录以管理您的电影票和预订",
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
    "login.emailInvalid":
      "请输入有效的电子邮箱地址。",
    "login.passwordRequired": "请输入密码。",
    "login.passwordMin":
      "密码至少需要6个字符。",
    "login.invalidCredentials":
      "电子邮箱或密码错误。",
    "login.loginFailed":
      "登录失败，请重试。",

    "login.lockedTitle":
      "账户暂时锁定",
    "login.lockedDescription":
      "错误尝试次数过多，请等待 {time} 后再试。",
    "login.tooManyAttempts":
      "失败次数过多，登录已锁定 {minutes} 分钟。",
    "login.attemptsRemaining":
      "还剩 {count} 次尝试",

    "register.title": "创建账户",
    "register.subtitle":
      "加入 CINEMAX，快速预订电影票并获取数字票",
    "register.fullName": "姓名",
    "register.fullNamePlaceholder":
      "例如：John Doe",
    "register.email": "电子邮箱",
    "register.emailPlaceholder":
      "name@example.com",
    "register.phone": "电话号码",
    "register.phonePlaceholder":
      "012 345 678",
    "register.password": "密码",
    "register.passwordPlaceholder":
      "••••••••",
    "register.signUp": "注册",
    "register.creating":
      "正在创建账户...",
    "register.haveAccount":
      "已经有账户？",
    "register.signIn": "登录",

    "register.fullNameRequired":
      "请输入姓名。",
    "register.fullNameMin":
      "姓名至少需要2个字符。",
    "register.emailRequired":
      "请输入电子邮箱。",
    "register.emailInvalid":
      "请输入有效的电子邮箱地址。",
    "register.phoneRequired":
      "请输入电话号码。",
    "register.phoneInvalid":
      "请输入有效的电话号码。",
    "register.passwordRequired":
      "请输入密码。",
    "register.passwordMin":
      "密码至少需要6个字符。",
    "register.failed":
      "注册失败，请重试。",

    "forgot.title": "忘记密码",
    "forgot.subtitle":
      "输入您的电子邮箱，我们会发送密码恢复验证码",
    "forgot.email": "注册邮箱",
    "forgot.emailPlaceholder":
      "name@example.com",
    "forgot.sendCode":
      "发送重置验证码",
    "forgot.sending":
      "正在发送...",
    "forgot.failed":
      "无法请求密码重置，请检查您的邮箱。",
    "forgot.back": "返回登录",

    "reset.title": "重置密码",
    "reset.subtitle":
      "输入发送到 {email} 的验证码以及您的新密码",
    "reset.code": "6位重置验证码",
    "reset.codePlaceholder": "123456",
    "reset.newPassword": "新密码",
    "reset.passwordPlaceholder":
      "••••••••",
    "reset.update": "更新密码",
    "reset.updating":
      "正在更新...",
    "reset.success":
      "密码重置成功！正在跳转到登录页面...",
    "reset.failed":
      "密码重置失败，请检查验证码。",
    "reset.invalidEmail":
      "电子邮箱无效或缺失。",

    "verify.title": "验证账户",
    "verify.subtitle":
      "输入发送到 {email} 的6位验证码",
    "verify.code": "验证码",
    "verify.codePlaceholder":
      "123456",
    "verify.button":
      "验证并登录",
    "verify.verifying":
      "正在验证...",
    "verify.didNotReceive":
      "没有收到验证码？",
    "verify.resendIn":
      "{seconds}秒后重新发送",
    "verify.resend":
      "重新发送验证码",
    "verify.resending":
      "正在重新发送...",
    "verify.success":
      "新的验证码已发送到您的邮箱。",
    "verify.invalid":
      "验证码无效或已过期。",
    "verify.resendFailed":
      "无法重新发送验证码。",

    "validation.codeRequired":
      "请输入验证码。",
    "validation.codeInvalid":
      "请输入有效的6位验证码。",
    "validation.passwordMin":
      "密码至少需要6个字符。",
  },
} as const;

/* ============================================================
   GENRES
============================================================ */

type GenreKey =
  | "Action"
  | "Adventure"
  | "Animation"
  | "Comedy"
  | "Crime"
  | "Documentary"
  | "Drama"
  | "Fantasy"
  | "Horror"
  | "Romance"
  | "Thriller"
  | "Science Fiction"
  | "Mystery"
  | "Musical"
  | "Western"
  | "Family"
  | "History"
  | "War";

const genreTranslations: Record<Language, Record<GenreKey, string>> = {
  en: {
    Action: "Action",
    Adventure: "Adventure",
    Animation: "Animation",
    Comedy: "Comedy",
    Crime: "Crime",
    Documentary: "Documentary",
    Drama: "Drama",
    Fantasy: "Fantasy",
    Horror: "Horror",
    Romance: "Romance",
    Thriller: "Thriller",
    "Science Fiction": "Sci-Fi",
    Mystery: "Mystery",
    Musical: "Musical",
    Western: "Western",
    Family: "Family",
    History: "Historical",
    War: "War",
  },

  km: {
    Action: "សកម្មភាព",
    Adventure: "ផ្សងព្រេង",
    Animation: "គំនូរជីវចល",
    Comedy: "កំប្លែង",
    Crime: "ឧក្រិដ្ឋកម្ម",
    Documentary: "ភាពយន្តឯកសារ",
    Drama: "រឿង",
    Fantasy: "រវើរវាយ",
    Horror: "ភ័យរន្ធត់",
    Romance: "ស្នេហា",
    Thriller: "រន្ធត់",
    "Science Fiction": "វិទ្យាសាស្ត្រប្រឌិត",
    Mystery: "អាថ៌កំបាំង",
    Musical: "តន្ត្រី",
    Western: "ខាងលិច",
    Family: "គ្រួសារ",
    History: "ប្រវត្តិសាស្ត្រ",
    War: "សង្គ្រាម",
  },

  zh: {
    Action: "动作",
    Adventure: "冒险",
    Animation: "动画",
    Comedy: "喜剧",
    Crime: "犯罪",
    Documentary: "纪录片",
    Drama: "剧情",
    Fantasy: "奇幻",
    Horror: "恐怖",
    Romance: "爱情",
    Thriller: "惊悚",
    "Science Fiction": "科幻",
    Mystery: "悬疑",
    Musical: "音乐",
    Western: "西部",
    Family: "家庭",
    History: "历史",
    War: "战争",
  },
};

const genreAliases: Record<string, GenreKey> = {
  action: "Action",
  adventure: "Adventure",
  animation: "Animation",
  comedy: "Comedy",
  crime: "Crime",
  documentary: "Documentary",
  drama: "Drama",
  fantasy: "Fantasy",
  horror: "Horror",
  romance: "Romance",
  thriller: "Thriller",

  "science fiction": "Science Fiction",
  "science-fiction": "Science Fiction",
  sciencefiction: "Science Fiction",
  "sci-fi": "Science Fiction",
  "sci fi": "Science Fiction",
  scifi: "Science Fiction",
  sci_fi: "Science Fiction",

  mystery: "Mystery",
  musical: "Musical",
  music: "Musical",
  western: "Western",
  family: "Family",

  history: "History",
  historical: "History",
  historic: "History",

  war: "War",
};

function normalizeGenre(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getGenreKey(genre: string): GenreKey | null {
  return genreAliases[normalizeGenre(genre)] ?? null;
}

/* ============================================================
   TYPES
============================================================ */

export type TranslationKey = keyof typeof translations.en;

export interface SettingsContextType {
  theme: Theme;
  language: Language;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  setLanguage: (language: Language) => void;

  t: (key: TranslationKey) => string;

  translateGenre: (genre: string) => string;
}

/* ============================================================
   CONTEXT
============================================================ */

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

/* ============================================================
   PROVIDER
============================================================ */

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Use safe default that matches the pre-render script's default
  // Don't read HTML class during initialization - causes hydration mismatch
  const [theme, setThemeState] = useState<Theme>("dark");
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  /* ----------------------------------------------------------
     SYNC FROM LOCALSTORAGE AND HTML CLASS — after hydration only
  ---------------------------------------------------------- */

  useEffect(() => {
    // First, check HTML class set by pre-render script
    const htmlElement = document.documentElement;
    const hasLightClass = htmlElement.classList.contains("light");

    if (hasLightClass) {
      setThemeState("light");
    }

    setMounted(true);

    try {
      const savedTheme = localStorage.getItem("cinemax-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
      }

      const savedLanguage =
        localStorage.getItem("cinemax-language") ||
        localStorage.getItem("cinemax_language");
      if (
        savedLanguage === "en" ||
        savedLanguage === "km" ||
        savedLanguage === "zh"
      ) {
        setLanguageState(savedLanguage);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }, []);

  /* ----------------------------------------------------------
     APPLY THEME TO DOM
  ---------------------------------------------------------- */

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);

    // Save theme to localStorage immediately
    try {
      localStorage.setItem("cinemax-theme", theme);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }

    // Apply colors to both html and body for consistency
    const bgColor = theme === "dark" ? "#020617" : "#ffffff";
    const fgColor = theme === "dark" ? "#f8fafc" : "#0f172a";

    root.style.backgroundColor = bgColor;
    root.style.color = fgColor;
    document.body.style.backgroundColor = bgColor;
    document.body.style.color = fgColor;
  }, [theme, mounted]);

  /* ----------------------------------------------------------
     APPLY LANGUAGE
  ---------------------------------------------------------- */

  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem("cinemax-language", language);
      localStorage.setItem("cinemax_language", language);
    } catch (error) {
      console.error("Failed to save language:", error);
    }

    document.documentElement.lang = language;
  }, [language, mounted]);

  /* ----------------------------------------------------------
     TRANSLATION
  ---------------------------------------------------------- */

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };

  const translateGenre = (genre: string): string => {
    if (!genre) return "";
    const genreKey = getGenreKey(genre);
    if (!genreKey) return genre;
    return (
      genreTranslations[language][genreKey] ??
      genreTranslations.en[genreKey] ??
      genre
    );
  };

  const value = useMemo(
    () => ({
      theme,
      language,
      setTheme: (newTheme: Theme) => {
        setThemeState(newTheme);
        try {
          localStorage.setItem("cinemax-theme", newTheme);
        } catch (error) {
          console.error("Failed to save theme:", error);
        }
      },
      toggleTheme: () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setThemeState(newTheme);
        try {
          localStorage.setItem("cinemax-theme", newTheme);
        } catch (error) {
          console.error("Failed to save theme:", error);
        }
      },
      setLanguage: setLanguageState,
      t,
      translateGenre,
    }),
    [theme, language]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/* ============================================================
   HOOK
============================================================ */

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }

  return context;
}

/* ============================================================
   COMPATIBILITY HOOK
===============================================================
   Your existing pages use useLanguage(). We keep that API so
   you don't need to rewrite every page immediately. It uses
   SettingsContext internally.
============================================================ */

export function useLanguage() {
  const { language, setLanguage, t, translateGenre } = useSettings();

  return { language, setLanguage, t, translateGenre };
}