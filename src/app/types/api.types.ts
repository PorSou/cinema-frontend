// ==========================================
// 1. Enums
// ==========================================
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CANCELLED";
export type HallType =
  | "STANDARD_2D"
  | "STANDARD_3D"
  | "IMAX"
  | "VIP"
  | "KIDS_HALL";
export type MovieStatus = "NOW_SHOWING" | "COMING_SOON" | "ENDED";
export type PaymentMethod = "KHQR_BAKONG" | "STRIPE_CARD" | "CASH";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type Role = "STAFF" | "CUSTOMER" | "ADMIN";
export type SeatType = "REGULAR" | "VIP" | "COUPLE";
export type MovieLanguage = "KHMER" | "ENGLISH" | "CHINESE";

// ==========================================
// 2. Spring Common Response Wrappers
// ==========================================
export interface ApiStatus {
  code: number;
  message: string;
}

export interface PageMetaData {
  totalPage: number;
  page: number;
  totalCount: number;
  pageSize: number;
}

export interface ApiBody<T> {
  data: T;
  page?: PageMetaData;
}

export interface ApiResponse<T> {
  success: boolean;
  body: ApiBody<T>;
  status: ApiStatus;
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

// ==========================================
// 3. User & Auth Contracts
// ==========================================
export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string | null;
  role: Role;
  isActive?: boolean;
  isDeleted?: boolean; // Matches Spring Backend SoftDelete status
  createdAt?: string;
  updatedAt?: string;
}

export interface UserUpdateRequest {
  fullName?: string;
  phone?: string;
  email?: string;
  role?: Role;
  password?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: UserResponse;
  isNewUser?: boolean;
}

export interface LoginRequest {
  email: string;
  password?: string;
  turnstileToken?: string | null;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  turnstileToken?: string | null;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}
export interface CashPaymentRequest {
  bookingId: number;
  paymentMethod: string;
  voucherCode?: string; // <-- Add this property
}
export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
}

// ==========================================
// 4. Cinema & Hall Contracts
// ==========================================
export interface CinemaRequest {
  name: string;
  city: string;
  address: string;
  phone: string;
}

export interface CinemaResponse {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  image?: string;
  totalHalls: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HallRequest {
  name: string;
  hallType: HallType;
  cinemaId: number;
}

export interface HallResponse {
  id: number;
  name: string;
  hallType: HallType;
  totalSeats: number;
  cinemaId: number;
  cinemaName: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 5. Seat & Layout Contracts
// ==========================================
export interface SeatRequest {
  seatRow: string;
  seatNumber: number;
  seatType: SeatType;
  hallId: number;
  gridX?: number;
  gridY?: number;
}

export interface BulkSeatGenerateRequest {
  hallId: number;
  startRow: string;
  endRow: string;
  seatsPerRow: number;
  seatType: SeatType;
}

export interface BatchSeatCreateRequest {
  hallId: number;
  seats: SeatRequest[];
}

export interface SeatResponse {
  id: number;
  seatCode: string;
  seatRow: string;
  seatNumber: number;
  seatType: SeatType;
  gridX: number;
  gridY: number;
  hallId: number;
  hallName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomSeatLayoutItem {
  seatRow: string;
  seatNumber: number;
  seatType: SeatType;
  gridX: number;
  gridY: number;
}

// ==========================================
// 6. Genre & Movie Contracts
// ==========================================
export interface GenreRequest {
  name: string;
}

export interface GenreResponse {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovieRequest {
  title: string;
  description?: string;
  durationMinutes: number;
  status: MovieStatus;
  language: MovieLanguage; // 👈 Enum type
  ageRating?: string;
  trailerUrl?: string;
  releaseDate?: string;
  genreIds?: number[];
  posterFile?: File | null;
}

export interface MovieResponse {
  id: number;
  title: string;
  description?: string;
  durationMinutes: number;
  status: MovieStatus;
  language: MovieLanguage; // 👈 Enum type
  ageRating?: string;
  posterUrl?: string;
  trailerUrl?: string;
  releaseDate?: string;
  genres: GenreResponse[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 7. Showtime Contracts
// ==========================================
export interface ShowtimeRequest {
  movieId: number;
  hallId: number;
  startTime: string; // Format: "yyyy-MM-dd HH:mm:ss"
  basePrice: number;
}

export interface ShowtimeResponse {
  id: number;
  startTime: string;
  endTime: string;
  basePrice: number;
  movieId: number;
  movieTitle: string;
  movieDurationMinutes: number;
  moviePosterUrl?: string;
  hallId: number;
  hallName: string;
  hallType: string;
  cinemaId: number;
  cinemaName: string;
  cinemaCity: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 8. Booking & Layout Selection Contracts
// ==========================================
export interface BookingRequest {
  showtimeId: number;
  seatIds: number[];
}

export interface TicketResponse {
  seatId: number;
  seatCode: string;
  seatRow: string;
  seatNumber: number;
  seatType: SeatType;
  price: number;
}

export interface BookingResponse {
  id: number;
  bookingNumber: string;
  status: BookingStatus;
  totalAmount: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  showtimeId: number;
  startTime: string;
  endTime: string;
  movieTitle: string;
  moviePosterUrl?: string;
  cinemaName: string;
  hallName: string;
  tickets: TicketResponse[];
  createdAt?: string;
  updatedAt?: string;
  checkedInAt?: string;
  checkedInBy?: string;
}

export interface SeatAvailabilityResponse {
  seatId: number;
  seatCode: string;
  seatRow: string;
  seatNumber: number;
  seatType: string;
  gridX: number;
  gridY: number;
  calculatedPrice: number;
  isAvailable: boolean; // Must match backend boolean
  availabilityStatus: "AVAILABLE" | "RESERVED" | "BOOKED";
}

export interface ShowtimeSeatLayoutResponse {
  showtimeId: number;
  hallId: number;
  hallName: string;
  totalSeats: number;
  seats: SeatAvailabilityResponse[];
}

export interface TicketCheckInResponse {
  bookingNumber: string;
  status: string;
  movieTitle: string;
  cinemaName: string;
  hallName: string;
  showtime: string;
  seatNumbers: string[];
  customerName: string;
  customerEmail: string;
  checkedInAt?: string;
  checkedInBy?: string;
  message?: string;
}

// ==========================================
// 9. Payment Contracts (Bakong KHQR)
// ==========================================
export interface KhqrGenerateRequest {
  bookingId: number;
  currency?: "USD" | "KHR";
}

export interface PaymentRequest {
  bookingId: number;
  paymentMethod: PaymentMethod;
}

export interface PaymentResponse {
  id: number;
  transactionId: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  qrCodeRaw?: string;
  qrCodeImageBase64?: string;
  paidAt?: string;
  bookingId: number;
  bookingNumber: string;
  bookingStatus: BookingStatus;
  customerName: string;
  customerEmail: string;
  movieTitle: string;
  cinemaName: string;
  hallName: string;
  ticketCount: number;
  createdAt?: string;
}

export interface BakongCheckMd5Response {
  responseCode: number; // 0 = Paid
  responseMessage: string;
  data?: {
    hash: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    currency: string;
    description: string;
    createdDateMs: number;
  };
}
