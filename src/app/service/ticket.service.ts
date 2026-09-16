import { TicketCheckInResponse } from "@/app/types/api.types";
import api from "../lib/api";

const extractData = (res: any) =>
  res.data?.body?.data || res.data?.data || res.data;

export const TicketService = {
  // Scans and validates a ticket at the gate, matching TicketCheckInController.java
  async scanTicket(bookingNumber: string): Promise<TicketCheckInResponse> {
    const res = await api.post(
      `/tickets/scan/${encodeURIComponent(bookingNumber)}`,
    );
    return extractData(res);
  },
};

export default TicketService;
