import api from "../lib/api";
import {
  PageResponse,
  ShowtimeSeatLayoutResponse,
  TicketCheckInResponse,
} from "@/app/types/api.types";

const extractData = (res: any) =>
  res.data?.body?.data || res.data?.data || res.data;

export interface TicketResponse {
  seatId: number;
  seatCode: string;
  seatRow: string;
  seatNumber: number;
  seatType: string;
  price: number;
}

export interface BookingResponse {
  id: number;
  bookingNumber?: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  showtimeId: number;
  movieTitle?: string;
  moviePosterUrl?: string;
  cinemaName?: string;
  hallName?: string;
  startTime?: string;
  totalAmount: number;
  discountAmount?: number;
  voucherCode?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "COMPLETED";
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  tickets?: TicketResponse[];
  createdAt: string;
  updatedAt: string;
}

// 👇 NEW — matches backend BookingRequest.java, which BookingServiceImpl
// reads via request.getConcessions() when building a booking. Previously
// missing here, which is what caused seatBookingPage's KHQR payload to
// need an `as any` cast just to include F&B selections.
export interface ConcessionSelectionRequest {
  concessionItemId: number;
  quantity: number;
}

export interface BookingRequest {
  showtimeId: number;
  seatIds: number[];
  concessions?: ConcessionSelectionRequest[];
}

export interface BookingQueryParams {
  status?: string;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}

export const BookingService = {
  async getSeatLayoutForShowtime(
    showtimeId: number,
  ): Promise<ShowtimeSeatLayoutResponse> {
    const res = await api.get(`/bookings/showtime/${showtimeId}/layout`);
    return extractData(res);
  },

  // 👇 UPDATED — now accepts an optional voucherCode as a second argument,
  // matching BookingServiceImpl.createBooking(userId, request, voucherCode)
  // on the backend. Sent as a query param on POST /bookings.
  //
  // ⚠️ NOTE: this assumes BookingController's create-booking endpoint reads
  // a `voucherCode` request param and forwards it to
  // bookingService.createBooking(currentUserId, request, voucherCode).
  // If BookingController doesn't do that yet, this param will be silently
  // ignored server-side even though it compiles fine here — confirm/add
  // that wiring in BookingController.java.
  async createBooking(
    request: BookingRequest,
    voucherCode?: string,
  ): Promise<BookingResponse> {
    const res = await api.post("/bookings", request, {
      params: voucherCode ? { voucherCode } : undefined,
    });
    return extractData(res);
  },

  async getAllBookings(
    params: BookingQueryParams = {},
  ): Promise<PageResponse<BookingResponse>> {
    const {
      status,
      search,
      page = 0,
      size = 10,
      sortBy = "createdAt",
      direction = "desc",
    } = params;

    const res = await api.get("/bookings", {
      params: {
        status: status || undefined,
        search: search ? search.trim() : undefined,
        page,
        size,
        sortBy,
        direction,
      },
    });
    return extractData(res);
  },

  async getBookingById(id: number): Promise<BookingResponse> {
    const res = await api.get(`/bookings/${id}`);
    return extractData(res);
  },

  async getByBookingNumber(bookingNumber: string): Promise<BookingResponse> {
    const res = await api.get(`/bookings/number/${bookingNumber}`);
    return extractData(res);
  },

  async cancelBooking(id: number): Promise<BookingResponse> {
    const res = await api.put(`/bookings/${id}/cancel`);
    return extractData(res);
  },

  async getMyBookings(page = 0, size = 10): Promise<any> {
    const res = await api.get("/bookings/my-bookings", {
      params: { page, size },
    });
    return extractData(res);
  },

  // Added check-in method for the gate admission scanner page
  async checkInTicket(bookingNumber: string): Promise<TicketCheckInResponse> {
    const res = await api.post(
      `/tickets/scan/${encodeURIComponent(bookingNumber)}`,
    );
    return extractData(res);
  },

  // 👇 Added method to manually confirm cash booking status if needed
  async confirmCashBooking(id: number): Promise<BookingResponse> {
    const res = await api.put(`/bookings/${id}/confirm-cash`);
    return extractData(res);
  },
};

export default BookingService;
